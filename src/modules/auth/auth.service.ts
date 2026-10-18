import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../common/enums/user-role.enum.js';
import {
  hashToken,
  verifySecret,
  verifyTokenHash,
} from '../../common/utils/hash.util.js';
import { toIpAddressOrNull } from '../../common/utils/ip.util.js';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { jwtConfig } from '../../config/jwt.config.js';
import type { IJwtConfig } from '../../config/interfaces/i-jwt-config.js';
import type { IDrizzleExecutor } from '../../database/interfaces/i-drizzle-executor.js';
import type { IUserRow } from '../../database/interfaces/i-user-row.js';
import { CompaniesService } from '../companies/companies.service.js';
import type { UserResponseDto } from '../users/dto/user-response.dto.js';
import { toUserResponse } from '../users/mappers/user.mapper.js';
import { UsersService } from '../users/users.service.js';
import type { AuthResponseDto } from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RefreshTokenDto } from './dto/refresh-token.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { IAuthTokens } from './interfaces/i-auth-tokens.js';
import type { IRefreshTokenPayload } from './interfaces/i-jwt-payload.js';
import type { IRequestContext } from './interfaces/i-request-context.js';
import { RefreshTokensRepository } from './refresh-tokens.repository.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY) private readonly config: IJwtConfig,
  ) {}

  async register(
    dto: RegisterDto,
    context: IRequestContext,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      phone: dto.phone,
      role: UserRole.CUSTOMER,
    });
    const row = await this.usersService.findRowOrFail(user.id);

    return { ...(await this.issueTokens(row, context)), user };
  }

  async login(
    dto: LoginDto,
    context: IRequestContext,
  ): Promise<AuthResponseDto> {
    const row = await this.usersService.findRowByEmail(dto.email);

    // One message for both cases, so the response cannot confirm which
    // emails exist
    if (!row || !(await verifySecret(row.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!row.isActive) {
      throw new UnauthorizedException(
        'This account has been deactivated. Contact an administrator to restore it.',
      );
    }

    await this.usersService.touchLastLogin(row.id);

    return {
      ...(await this.issueTokens(row, context)),
      user: toUserResponse(row),
    };
  }

  async refresh(
    dto: RefreshTokenDto,
    context: IRequestContext,
  ): Promise<IAuthTokens> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const stored = await this.refreshTokensRepository.findById(payload.jti);

    if (!stored) {
      throw new UnauthorizedException(
        'This refresh token is not recognised. Please sign in again.',
      );
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(
        'Your session has expired. Please sign in again.',
      );
    }

    // A replayed token means the family may be compromised — drop every session
    if (stored.revokedAt) {
      await this.refreshTokensRepository.revokeAllForUser(stored.userId);
      this.logger.warn(
        `Refresh token replay detected for user ${stored.userId}`,
      );
      throw new UnauthorizedException(
        'This session was ended for security reasons. Please sign in again.',
      );
    }

    if (!verifyTokenHash(stored.tokenHash, dto.refreshToken)) {
      throw new UnauthorizedException(
        'This refresh token is not recognised. Please sign in again.',
      );
    }

    const row = await this.usersService.findRowOrFail(payload.sub);

    if (!row.isActive) {
      throw new UnauthorizedException(
        'This account has been deactivated. Contact an administrator to restore it.',
      );
    }

    // Revoke and reissue together, so a failed insert never strands the user
    return this.refreshTokensRepository.transaction(async (tx) => {
      const isRevoked = await this.refreshTokensRepository.revokeById(stored.id, tx);

      if (!isRevoked) {
        throw new UnauthorizedException(
          'This refresh token was already used. Please sign in again.',
        );
      }

      return this.issueTokens(row, context, tx);
    });
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    await this.refreshTokensRepository.revokeById(payload.jti);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokensRepository.revokeAllForUser(userId);
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(userId);

    if (!user.companyId) {
      return user;
    }

    const company = await this.companiesService.findOne(user.companyId);
    user.companyName = company.name;
    user.voiceAssistantEnabled = company.voiceAssistantEnabled;

    return user;
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<IRefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<IRefreshTokenPayload>(token, {
        secret: this.config.refreshSecret,
        issuer: this.config.issuer,
      });
    } catch {
      throw new UnauthorizedException(
        'That refresh token is malformed or has expired. Please sign in again.',
      );
    }
  }

  private async issueTokens(
    user: IUserRow,
    context: IRequestContext,
    executor?: IDrizzleExecutor,
  ): Promise<IAuthTokens> {
    const jti = uuidv7();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user.id,
          role: user.role,
          companyId: user.companyId,
        },
        {
          secret: this.config.accessSecret,
          expiresIn: this.config.accessExpiresIn,
          issuer: this.config.issuer,
        },
      ),
      this.jwtService.signAsync(
        { sub: user.id, jti },
        {
          secret: this.config.refreshSecret,
          expiresIn: this.config.refreshExpiresIn,
          issuer: this.config.issuer,
        },
      ),
    ]);

    const decoded = this.jwtService.decode<{ exp: number }>(refreshToken);

    await this.refreshTokensRepository.create(
      {
        id: jti,
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(decoded.exp * 1000),
        userAgent: context.userAgent?.slice(0, 255),
        ipAddress: toIpAddressOrNull(context.ipAddress),
      },
      executor,
    );

    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }
}
