import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DatabaseModule } from './database/database.module';
import { JwtGlobalModule } from './common/jwt-global.module';
import { StorageModule } from './common/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { TemplateModule } from './modules/template/template.module';
import { SiteModule } from './modules/site/site.module';
import { PublishModule } from './modules/publish/publish.module';
import { RenderModule } from './modules/render/render.module';
import { OperationsModule } from './modules/operations/operations.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { GlobalBlockModule } from './modules/global-block/global-block.module';
import { GlobalBlock } from './modules/global-block/global-block.entity';
import { ArticleModule } from './modules/article/article.module';
import { Article, ArticleCategory } from './modules/article/article.entity';
import { CopyPageModule } from './modules/copy-page/copy-page.module';
import { AdminModule } from './modules/admin/admin.module';
import { MediaModule } from './modules/media/media.module';
import { MediaAsset } from './modules/media/media.entity';
import { PluginDefinition } from './modules/admin/entities';
import { Tenant } from './modules/tenant/tenant.entity';
import { User } from './modules/auth/user.entity';
import { Template } from './modules/template/template.entity';
import { Site } from './modules/site/site.entity';
import { PublishRecord } from './modules/publish/publish-record.entity';
import {
  Page, Domain, FormSubmission, AuditLog, AnalyticsEvent, PluginInstall,
} from './modules/operations/entities';
import {
  Plan, Subscription, Order, Coupon, Campaign, MemberLevel, Member,
  Product, ShopOrder, Distributor, Commission,
} from './modules/commerce/entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    // 全局限流：60 秒内最多 300 请求；登录等敏感端点单独更严
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: configuration().database.host,
      port: configuration().database.port,
      username: configuration().database.username,
      password: configuration().database.password,
      database: configuration().database.name,
      entities: [
        Tenant, User, Template, Site, PublishRecord,
        Page, Domain, FormSubmission, AuditLog, AnalyticsEvent, PluginInstall,
        Plan, Subscription, Order, Coupon, Campaign, MemberLevel, Member,
        Product, ShopOrder, Distributor, Commission,
        GlobalBlock,
        Article, ArticleCategory,
        PluginDefinition,
        MediaAsset,
      ],
      synchronize: false,
    }),
    DatabaseModule,
    JwtGlobalModule,
    StorageModule,
    AuthModule,
    TenantModule,
    TemplateModule,
    SiteModule,
    PublishModule,
    RenderModule,
    OperationsModule,
    CommerceModule,
    GlobalBlockModule,
    ArticleModule,
    CopyPageModule,
    AdminModule,
    MediaModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
