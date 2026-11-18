import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * 全局 JWT 模块：让 TenantMiddleware 等基础设施也能注入 JwtService。
 * AuthModule 中的 JwtModule 可移除，统一用此全局模块。
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class JwtGlobalModule {}
