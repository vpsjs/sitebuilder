import { IsOptional, IsString } from 'class-validator';

export class PublishDto {
  @IsString()
  @IsOptional()
  note?: string;
}
