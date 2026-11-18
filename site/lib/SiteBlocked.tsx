/**
 * 站点被禁用 / 过期的统一提示页（内容区，由 layout 提供 html/body）。
 * 访客看到原因，并可点击按钮前往用户后台（管理站点）。
 */

export function SiteBlocked({
  reason,
  tenantSlug,
  userBackendUrl,
}: {
  reason: string;
  tenantSlug?: string;
  userBackendUrl?: string;
}) {
  const backend = userBackendUrl ?? process.env.NEXT_PUBLIC_USER_BACKEND ?? 'http://localhost:5175';
  const target = tenantSlug ? `${backend}/?tenant=${encodeURIComponent(tenantSlug)}#/sites` : `${backend}/`;

  return (
    <div style={styles.wrap}>
      <style>{`
        .sb-blocked-btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(15,23,42,.2)}
      `}</style>
      <div style={styles.card}>
        <div style={styles.icon}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1" />
          </svg>
        </div>
        <h1 style={styles.title}>当前站点已被禁用</h1>
        <p style={styles.reason}>{reason}</p>
        <p style={styles.hint}>如需恢复访问，请前往用户后台查看站点状态或联系管理员处理。</p>
        <a className="sb-blocked-btn" href={target} style={styles.btn}>
          前往用户后台
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
        <div style={styles.footer}>SiteBuilder Studio · 站点服务</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg,#F8FAFC 0%,#EEF2FF 100%)', padding: 24,
    fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color: '#0F172A',
  },
  card: {
    width: 'min(520px,100%)', background: '#fff', border: '1px solid #E5E7EB',
    borderRadius: 18, boxShadow: '0 20px 60px rgba(15,23,42,.08)', padding: '48px 40px', textAlign: 'center',
  },
  icon: {
    width: 64, height: 64, borderRadius: 16, background: '#FEF3C7', color: '#D97706',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px',
  },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 10 },
  reason: { fontSize: 14, color: '#64748B', lineHeight: 1.7, marginBottom: 8 },
  hint: { fontSize: 12, color: '#94A3B8', marginBottom: 30 },
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10,
    background: '#171717', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600,
    transition: 'transform .15s,box-shadow .15s',
  },
  footer: { marginTop: 26, fontSize: 11, color: '#CBD5E1' },
};
