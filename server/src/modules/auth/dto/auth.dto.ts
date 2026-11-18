import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  /** 公司/租户名称，注册时同时创建租户 */
  @IsString()
  @IsNotEmpty()
  tenantName: string;

  @IsString()
  @IsOptional()
  tenantSlug?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
