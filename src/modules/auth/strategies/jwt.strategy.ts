import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import passportJwt from 'passport-jwt';
import { jwtConfig } from '../../../config/jwt.config.js';
import type { IJwtConfig } from '../../../config/interfaces/i-jwt-config.js';
import { UsersService } from '../../users/users.service.js';
import type { IAuthenticatedUser } from '../interfaces/i-authenticated-user.js';
import type { IAccessTokenPayload } from '../interfaces/i-jwt-payload.js';

const { ExtractJwt, Strategy } = passportJwt;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(jwtConfig.KEY) config: IJwtConfig,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessSecret,
      issuer: config.issuer,
    });
  }

  async validate(payload: IAccessTokenPayload): Promise<IAuthenticatedUser> {
    const user = await this.usersService
      .findRowOrFail(payload.sub)
      .catch(() => undefined);

    if (!user) {
      throw new UnauthorizedException(
        'The account linked to this token no longer exists',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'This account has been deactivated. Contact an administrator to restore it.',
      );
    }

    return {
      id: user.id,
      role: user.role,
      companyId: user.companyId,
    };
  }
}
