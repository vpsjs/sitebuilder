import { Module } from '@nestjs/common';
import { GlobalBlockController } from './global-block.controller';
import { GlobalBlockService } from './global-block.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [GlobalBlockController],
  providers: [GlobalBlockService],
  exports: [GlobalBlockService],
})
export class GlobalBlockModule {}
