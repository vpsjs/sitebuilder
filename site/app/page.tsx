import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '80px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#171717', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>S</div>
        <div>
          <h1 style={{ fontSize: 20, margin: 0 }}>SiteBuilder 站点渲染器</h1>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>独立 Next.js 服务 · 服务端渲染已发布 DSL</p>
        </div>
      </div>

      <div style={{ marginTop: 40, padding: 24, border: '1px solid #E5E7EB', borderRadius: 12 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>访问一个已发布的站点</h2>
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
          站点渲染器按 <code>/s/租户标识/站点标识</code> 读取后端已发布快照，
          并用与装修器完全相同的组件渲染。演示租户 slug 为 <code>demo</code>。
        </p>
        <Link
          href="/s/demo/my-site"
          style={{ display: 'inline-block', marginTop: 8, padding: '10px 20px', borderRadius: 8, background: '#D4AF37', color: '#171717', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
        >
          查看演示站点 →
        </Link>
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: '#94A3B8', lineHeight: 1.7 }}>
        工作方式：装修器发布 → NestJS 固化 published_schema → 本站服务端 fetch → 共享组件渲染。
        支持 ISR（60s）与按 tag 失效，SEO 友好。
      </p>
    </main>
  );
}
