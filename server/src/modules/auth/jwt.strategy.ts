import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TenantQueryService } from '../../database/tenant-query.service';
import { User } from './user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly tenantQuery: TenantQueryService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    // 每次请求都查库确认用户仍存在且启用，避免使用已删除用户的旧 token
    const user = await this.tenantQuery.runUnscoped((m) =>
      m.getRepository(User).findOne({ where: { id: payload.sub } }),
    );
    if (!user || user.status === 'disabled') throw new UnauthorizedException('用户不存在或已禁用');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };
  }
}
