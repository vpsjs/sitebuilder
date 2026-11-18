import { Global, Module } from '@nestjs/common';
import { TenantQueryService } from './tenant-query.service';

/**
 * 全局数据库模块：导出 TenantQueryService 供所有业务模块注入。
 * 标记为 @Global，业务模块无需重复 imports。
 */
@Global()
@Module({
  providers: [TenantQueryService],
  exports: [TenantQueryService],
})
export class DatabaseModule {}
