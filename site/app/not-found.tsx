import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 48, margin: 0 }}>404</h1>
      <p style={{ color: '#475569', marginTop: 12 }}>站点不存在或尚未发布</p>
      <Link href="/" style={{ display: 'inline-block', marginTop: 24, color: '#A67C1E', fontSize: 14 }}>
        返回首页
      </Link>
    </main>
  );
}
