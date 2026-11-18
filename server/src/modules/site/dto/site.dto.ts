import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsObject()
  @IsOptional()
  draftSchema?: Record<string, unknown>;
}

export class SaveDraftDto {
  @IsObject()
  schema: Record<string, unknown>;
}
