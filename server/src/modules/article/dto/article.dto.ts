import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() slug?: string;
  @IsInt() @IsOptional() sortOrder?: number;
}
export class UpdateCategoryDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() slug?: string;
  @IsInt() @IsOptional() sortOrder?: number;
}
export class CreateArticleDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() summary?: string;
  @IsString() @IsOptional() content?: string;
  @IsString() @IsOptional() cover?: string;
  @IsString() @IsOptional() categoryId?: string;
  @IsString() @IsOptional() status?: string;
}
export class UpdateArticleDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() summary?: string;
  @IsString() @IsOptional() content?: string;
  @IsString() @IsOptional() cover?: string;
  @IsString() @IsOptional() categoryId?: string | null;
  @IsString() @IsOptional() status?: string;
}
