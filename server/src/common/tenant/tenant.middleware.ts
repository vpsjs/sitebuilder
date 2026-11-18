import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from './tenant-context';
import type { JwtPayload } from '../../modules/auth/jwt.strategy';

/**
 * 租户上下文中间件
 * ------------------------------------------------------------------
 * 从 JWT 中解析租户身份，注入 AsyncLocalStorage。
 * 后续所有 Service 通过 TenantContext 读取，实现用户端隔离。
 * 无效 token 时不抛错，交给 JwtAuthGuard 统一处理 401。
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    let payload: JwtPayload | null = null;

    if (header?.startsWith('Bearer ')) {
      try {
        payload = this.jwt.verify<JwtPayload>(header.slice(7), {
          secret: this.config.get<string>('jwt.secret'),
        });
      } catch {
        // token 无效，交由守卫返回 401
      }
    }

    TenantContext.run(
      {
        tenantId: payload?.tenantId ?? null,
        userId: payload?.sub ?? 'anonymous',
        role: payload?.role ?? 'anonymous',
        isSuperAdmin: payload?.role === 'super_admin',
      },
      () => next(),
    );
  }
}
