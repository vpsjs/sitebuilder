import { IsUrl, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class FetchPageDto {
  @IsUrl({ require_tld: false }, { message: '请输入合法的网址（含 http/https）' })
  @IsNotEmpty()
  url: string;

  /** 复制模式：fidelity=区块级保真(推荐) / modules=语义模块 / snapshot=整页快照 */
  @IsOptional()
  @IsIn(['fidelity', 'modules', 'snapshot'])
  mode?: 'fidelity' | 'modules' | 'snapshot';

  /** 兼容旧前端：true 等同 modules */
  @IsOptional()
  smart?: boolean;
}
