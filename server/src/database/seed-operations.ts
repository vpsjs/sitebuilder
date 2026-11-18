/**
 * 运营数据种子：套餐、会员等级、演示数据
 * 运行：npm run seed:ops
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import configuration from '../config/configuration';

const config = configuration();

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: config.database.host,
    port: config.database.port,
    username: 'sitebuilder',
    password: 'sitebuilder_dev',
    database: config.database.name,
    synchronize: false,
  });
  await ds.initialize();

  // 套餐
  if (await ds.query('SELECT count(*) FROM plans').then((r) => Number(r[0].count)) === 0) {
    await ds.query(`
      INSERT INTO plans (code, name, price_monthly, price_yearly, features, limits, sort_order) VALUES
      ('free', '免费版', 0, 0, '["1个站点","基础组件","100条留言/月"]', '{"sites":1,"pages":3,"storage":100,"formSubmissions":100}', 1),
      ('pro', '专业版', 99, 990, '["10个站点","全部组件","自定义域名","去广告","1万条留言/月"]', '{"sites":10,"pages":100,"storage":5000,"formSubmissions":10000}', 2),
      ('flagship', '旗舰版', 299, 2990, '["无限站点","全部插件","营销工具","会员分销","专项客服"]', '{"sites":999,"pages":9999,"storage":50000,"formSubmissions":999999}', 3)
    `);
    console.log('✓ 套餐已创建: 3 个');
  }

  const tenant = await ds.query("SELECT id FROM tenants WHERE slug='demo'").then((r) => r[0]);
  if (tenant) {
    // 订阅
    if (await ds.query('SELECT count(*) FROM subscriptions').then((r) => Number(r[0].count)) === 0) {
      const plan = await ds.query("SELECT id FROM plans WHERE code='pro'").then((r) => r[0]);
      await ds.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, current_period_end) VALUES ($1,$2,'active','yearly',now() + interval '1 year')`,
        [tenant.id, plan.id],
      );
      await ds.query("UPDATE tenants SET plan='pro' WHERE id=$1", [tenant.id]);
      console.log('✓ 演示租户订阅已创建: pro');
    }

    // 会员等级
    if (await ds.query('SELECT count(*) FROM member_levels').then((r) => Number(r[0].count)) === 0) {
      await ds.query(`
        INSERT INTO member_levels (tenant_id, name, min_points, discount, color, sort_order) VALUES
        ($1,'普通会员',0,1.00,'#94A3B8',1),
        ($1,'银卡会员',1000,0.95,'#64748B',2),
        ($1,'金卡会员',5000,0.90,'#D4AF37',3),
        ($1,'钻石会员',20000,0.80,'#0EA5E9',4)
      `, [tenant.id]);
      console.log('✓ 会员等级已创建: 4 级');
    }

    // 演示会员
    if (await ds.query('SELECT count(*) FROM members').then((r) => Number(r[0].count)) === 0) {
      const levels = await ds.query('SELECT id FROM member_levels ORDER BY sort_order').then((r: {id:string}[]) => r);
      const names = ['张伟', '李娜', '王强', '陈静', '刘洋'];
      for (let i = 0; i < names.length; i++) {
        await ds.query(
          `INSERT INTO members (tenant_id, name, phone, level_id, points, total_spent, tags) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [tenant.id, names[i], `1380000${String(i).padStart(4,'0')}`, levels[i % levels.length].id, (i + 1) * 800, (i + 1) * 1200, JSON.stringify(['活跃客户'])],
        );
      }
      console.log('✓ 演示会员已创建: 5 个');
    }

    // 演示商品
    if (await ds.query('SELECT count(*) FROM products').then((r) => Number(r[0].count)) === 0) {
      await ds.query(`
        INSERT INTO products (tenant_id, name, description, price, stock, category) VALUES
        ($1,'企业官网建站服务','专业建站套餐，含域名与托管',1999.00,999,'服务'),
        ($1,'品牌视觉设计','LOGO+VI设计全套',3999.00,99,'设计'),
        ($1,'数字营销推广','搜索引擎优化与推广',5999.00,50,'营销')
      `, [tenant.id]);
      console.log('✓ 演示商品已创建: 3 个');
    }

    // 演示优惠券
    if (await ds.query('SELECT count(*) FROM coupons').then((r) => Number(r[0].count)) === 0) {
      await ds.query(`
        INSERT INTO coupons (tenant_id, name, type, value, min_amount, total, starts_at, ends_at) VALUES
        ($1,'新客立减','amount',100,500,1000,now(),now() + interval '90 days'),
        ($1,'会员9折','discount',0.9,0,500,now(),now() + interval '90 days')
      `, [tenant.id]);
      console.log('✓ 演示优惠券已创建: 2 张');
    }

    // 演示分销员
    if (await ds.query('SELECT count(*) FROM distributors').then((r) => Number(r[0].count)) === 0) {
      await ds.query(`
        INSERT INTO distributors (tenant_id, name, code, commission_rate, total_commission) VALUES
        ($1,'渠道伙伴A','PARTNER-A',15.00,3500.00),
        ($1,'渠道伙伴B','PARTNER-B',10.00,1200.00)
      `, [tenant.id]);
      console.log('✓ 演示分销员已创建: 2 个');
    }

    // 演示页面（多页面）
    const site = await ds.query("SELECT id FROM sites WHERE slug='my-site'").then((r) => r[0]);
    if (site && await ds.query('SELECT count(*) FROM pages').then((r) => Number(r[0].count)) === 0) {
      const published = await ds.query('SELECT published_schema FROM sites WHERE id=$1', [site.id]).then((r) => r[0]?.published_schema);
      await ds.query(
        `INSERT INTO pages (tenant_id, site_id, name, slug, is_home, published_schema, status, sort_order) VALUES ($1,$2,'首页','home',true,$3,'published',0)`,
        [tenant.id, site.id, JSON.stringify(published ?? { version: 1, meta: { title: '首页' }, root: { id: 'root', type: 'container', props: {}, children: [] } })],
      );
      await ds.query(
        `INSERT INTO pages (tenant_id, site_id, name, slug, is_home, published_schema, status, sort_order) VALUES ($1,$2,'关于我们','about',false,$3,'published',1)`,
        [tenant.id, site.id, JSON.stringify({ version: 1, meta: { title: '关于我们' }, root: { id: 'root', type: 'container', props: { padding: 48, gap: 12 }, children: [
          { id: 'h', type: 'heading', props: { text: '关于我们', level: 'h1', align: 'center' } },
          { id: 't', type: 'text', props: { content: '我们是一家专业的数字服务公司。', align: 'center' } }
        ] } })],
      );
      console.log('✓ 演示页面已创建: 2 个');
    }

    // 演示表单留言
    if (await ds.query('SELECT count(*) FROM form_submissions').then((r) => Number(r[0].count)) === 0) {
      for (let i = 0; i < 8; i++) {
        await ds.query(
          `INSERT INTO form_submissions (tenant_id, site_id, form_id, data, status, created_at) VALUES ($1,$2,'contact',$3,$4,now() - interval '${i * 3} hours')`,
          [tenant.id, site?.id ?? null, JSON.stringify({ name: ['王先生','李女士','张先生','陈女士'][i%4], phone: `1390000${String(i).padStart(4,'0')}`, message: '想了解建站服务，请尽快联系我。' }), i % 3 === 0 ? 'unread' : 'read'],
        );
      }
      console.log('✓ 演示留言已创建: 8 条');
    }

    // 演示统计事件
    if (await ds.query('SELECT count(*) FROM analytics_events').then((r) => Number(r[0].count)) === 0) {
      for (let i = 0; i < 200; i++) {
        await ds.query(
          `INSERT INTO analytics_events (tenant_id, site_id, type, data, created_at) VALUES ($1,$2,'page_view',$3,now() - interval '${i} hours')`,
          [tenant.id, site?.id ?? null, JSON.stringify({ path: '/', referrer: i % 3 === 0 ? 'baidu.com' : 'direct' })],
        );
      }
      console.log('✓ 演示统计事件已创建: 200 条');
    }
  }

  await ds.destroy();
  console.log('运营种子数据完成');
}

seed().catch((err) => { console.error(err); process.exit(1); });
