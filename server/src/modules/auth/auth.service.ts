import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { TenantQueryService } from '../../database/tenant-query.service';
import { Tenant } from '../tenant/tenant.entity';
import { User } from './user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantQuery: TenantQueryService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    return this.tenantQuery.runUnscoped(async (m) => {
      const existing = await m.getRepository(User).findOne({ where: { email: dto.email } });
      if (existing) throw new ConflictException('邮箱已被注册');

      const slug = dto.tenantSlug ?? dto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const slugTaken = await m.getRepository(Tenant).findOne({ where: { slug } });
      if (slugTaken) throw new ConflictException('租户标识已被占用，请更换 tenantSlug');

      const tenant = await m.getRepository(Tenant).save(
        m.getRepository(Tenant).create({ name: dto.tenantName, slug }),
      );
      const passwordHash = await bcrypt.hash(dto.password, 10);
      const user = await m.getRepository(User).save(
        m.getRepository(User).create({
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          name: dto.name,
          role: 'tenant_admin',
        }),
      );
      return this.sign(user);
    });
  }

  async login(dto: LoginDto) {
    return this.tenantQuery.runUnscoped(async (m) => {
      const user = await m.getRepository(User)
        .createQueryBuilder('u')
        .addSelect('u.passwordHash')
        .where('u.email = :email', { email: dto.email })
        .getOne();
      if (!user) throw new UnauthorizedException('邮箱或密码错误');
      if (user.status === 'disabled') throw new UnauthorizedException('账号已被禁用，请联系管理员');

      const ok = await bcrypt.compare(dto.password, user.passwordHash);
      if (!ok) throw new UnauthorizedException('邮箱或密码错误');

      await m.getRepository(User).update(user.id, { lastLoginAt: new Date() });
      return this.sign(user);
    });
  }

  private sign(user: User) {
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });
    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
