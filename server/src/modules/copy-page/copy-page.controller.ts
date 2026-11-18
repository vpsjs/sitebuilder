import { Body, Controller, Post } from '@nestjs/common';
import { CopyPageService, FetchResult } from './copy-page.service';
import { FetchPageDto } from './dto/fetch-page.dto';

@Controller('copy-page')
export class CopyPageController {
  constructor(private readonly service: CopyPageService) {}

  @Post('fetch')
  fetch(@Body() dto: FetchPageDto): Promise<FetchResult> {
    const mode = dto.mode || (dto.smart ? 'modules' : 'fidelity');
    return this.service.fetch(dto.url, mode);
  }
}
