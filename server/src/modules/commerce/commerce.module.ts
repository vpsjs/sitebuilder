import { Module } from '@nestjs/common';
import { CommerceService } from './commerce.service';
import {
  BillingController, CouponsController, CampaignsController,
  MembersController, ProductsController, ShopOrdersController, DistributorsController,
} from './commerce.controller';
import { TeamController } from './team.controller';

@Module({
  controllers: [
    BillingController, CouponsController, CampaignsController,
    MembersController, ProductsController, ShopOrdersController, DistributorsController,
    TeamController,
  ],
  providers: [CommerceService],
  exports: [CommerceService],
})
export class CommerceModule {}
