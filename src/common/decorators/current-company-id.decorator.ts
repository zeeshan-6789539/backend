import {
  createParamDecorator,
  ForbiddenException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { IAuthenticatedUser } from '../../modules/auth/interfaces/i-authenticated-user.js';

// Tenant scope for dealer routes — always taken from the token, never from the request body
export const CurrentCompanyId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: IAuthenticatedUser }>();

    if (!request.user.companyId) {
      throw new ForbiddenException(
        'Your account is not linked to a company. Ask a super admin to assign one, then sign in again.',
      );
    }

    return request.user.companyId;
  },
);
