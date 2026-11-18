import { Module } from '@nestjs/common';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';
import { MiniAppController } from './miniapp.controller';

@Module({
  controllers: [RenderController, MiniAppController],
  providers: [RenderService],
})
export class RenderModule {}
