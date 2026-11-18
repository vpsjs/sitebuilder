import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantService } from './tenant.service';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('mine')
  findMine() {
    return this.tenantService.findMine();
  }

  @Get()
  @Roles('super_admin')
  findAll() {
    return this.tenantService.findAll();
  }
}
