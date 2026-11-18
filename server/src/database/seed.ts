/**
 * 种子数据：超管账号 + 演示租户 + 全局模板
 * 运行：npm run seed
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import configuration from '../config/configuration';
import { Tenant } from '../modules/tenant/tenant.entity';
import { User } from '../modules/auth/user.entity';
import { Template } from '../modules/template/template.entity';

const config = configuration();

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.name,
    entities: [Tenant, User, Template],
    synchronize: false,
  });
  await ds.initialize();

  // 种子脚本需要跨租户写入，显式解除 RLS（等价于运行时的 runUnscoped）
  await ds.query(`SELECT set_config('app.is_super_admin', 'on', false)`);

  // 超管（无租户）
  const superEmail = 'admin@sitebuilder.io';
  if (!await ds.getRepository(User).findOne({ where: { email: superEmail } })) {
    await ds.getRepository(User).save({
      tenantId: null,
      email: superEmail,
      passwordHash: await bcrypt.hash('admin123', 10),
      name: '超级管理员',
      role: 'super_admin',
    });
    console.log('✓ 超管已创建:', superEmail, '/ admin123');
  }

  // 演示租户 + 租户管理员
  const tenantSlug = 'demo';
  let tenant = await ds.getRepository(Tenant).findOne({ where: { slug: tenantSlug } });
  if (!tenant) {
    tenant = await ds.getRepository(Tenant).save({
      name: '演示企业', slug: tenantSlug, plan: 'pro', status: 'active',
    });
    console.log('✓ 演示租户已创建:', tenantSlug);
  }

  const userEmail = 'user@demo.com';
  if (!await ds.getRepository(User).findOne({ where: { email: userEmail } })) {
    await ds.getRepository(User).save({
      tenantId: tenant.id,
      email: userEmail,
      passwordHash: await bcrypt.hash('demo123', 10),
      name: '演示用户',
      role: 'tenant_admin',
    });
    console.log('✓ 租户管理员已创建:', userEmail, '/ demo123');
  }

  // 全局模板：与装修器/core 共用同一份 catalog.json，按名称幂等更新
  const catalogPath = path.resolve(__dirname, '../../../packages/core/src/templates/catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as Array<{
    name: string;
    category: string;
    description: string;
    cover: string;
    schema: Record<string, unknown>;
  }>;
  const templateRepo = ds.getRepository(Template);

  // 兼容旧种子里的“商务简约”：若企业官网首页尚未存在，则就地升级它
  const enterprise = catalog.find((item) => item.name === '企业官网首页');
  if (enterprise && !await templateRepo.findOne({ where: { name: enterprise.name } })) {
    const legacy = await templateRepo.findOne({ where: { name: '商务简约' } });
    if (legacy) {
      legacy.name = enterprise.name;
      await templateRepo.save(legacy);
    }
  }

  for (const item of catalog) {
    const existing = await templateRepo.findOne({ where: { name: item.name } });
    await templateRepo.save({
      ...(existing ?? {}),
      tenantId: null,
      name: item.name,
      category: item.category,
      description: item.description,
      cover: item.cover,
      schema: item.schema,
      isGlobal: true,
    });
  }

  const stale = await templateRepo.findOne({ where: { name: '商务简约' } });
  if (stale?.isGlobal) await templateRepo.remove(stale);
  console.log(`✓ 全局模板已同步: ${catalog.length} 套`);

  await ds.destroy();
  console.log('种子数据完成');
}

seed().catch((err) => {
  console.error('种子数据失败:', err);
  process.exit(1);
});
