import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantQueryService } from '../../database/tenant-query.service';
import { TenantContext } from '../../common/tenant/tenant-context';

/** 团队协作：成员列表与邀请（轻量实现，邀请链接 Scheme 由前端处理） */
@Controller('team')
export class TeamController {
  constructor(private readonly db: TenantQueryService) {}

  @Get('members')
  async members() {
    return this.db.run((m) =>
      m.query(
        `SELECT u.id, u.email, u.name, u.role, u.created_at AS "createdAt"
         FROM users u WHERE u.tenant_id = $1 ORDER BY u.created_at`,
        [TenantContext.getTenantId()],
      ),
    );
  }

  @Post('invite')
  @Roles('tenant_admin', 'super_admin')
  async invite(@Body() body: { email: string; role?: string }) {
    const token = `inv-${Math.random().toString(36).slice(2, 18)}`;
    await this.db.run((m) =>
      m.query(
        `INSERT INTO invitations (tenant_id, email, role, token, expires_at)
         VALUES ($1,$2,$3,$4, now() + interval '7 days')`,
        [TenantContext.getTenantId(), body.email, body.role ?? 'user', token],
      ),
    );
    return { email: body.email, token, inviteUrl: `/invite/${token}` };
  }

  @Post('accept/:token')
  async accept(@Param('token') token: string, @Body() body: { password: string; name?: string }) {
    // 生产：验证 token 有效性、用 bcrypt 哈希密码、创建用户
    return { accepted: true, token, message: '邀请已接受（演示：需接入密码哈希）' };
  }
}
