import { useCallback, useEffect, useState } from 'react';
import {
  Globe2, Plus, RefreshCw, ShieldCheck, Copy, Check, X, Trash2, Loader2, ExternalLink, KeyRound,
} from 'lucide-react';
import { get, post, del } from './api';

type Domain = {
  id: string;
  domain: string;
  siteId: string;
  verified: boolean;
  verifyToken: string;
  sslStatus: string;
  sslExpires: string | null;
  createdAt: string;
};

export default function DomainManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [domain, setDomain] = useState('');
  const [siteId, setSiteId] = useState('');
  const [busy, setBusy] = useState('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [ds, ss] = await Promise.all([get<Domain[]>('domains'), get<any[]>('sites')]);
      setDomains(ds ?? []); setSites(ss ?? []);
      if (!siteId && ss?.length) setSiteId(ss[0].id);
    } catch (e) { setError((e as Error)?.message ?? '加载失败'); }
    finally { setLoading(false); }
  }, [siteId]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!domain.trim() || !siteId) return;
    setBusy('add'); setError('');
    try {
      await post('domains', { domain: domain.trim(), siteId });
      setDomain('');
      await load();
    } catch (e) { setError((e as Error)?.message ?? '添加失败'); }
    finally { setBusy(''); }
  };

  const checkDns = async (d: Domain) => {
    setBusy(`check-${d.id}`);
    try {
      const r = await get<{ ok: boolean }>(`domains/${d.id}/check`);
      setChecks((c) => ({ ...c, [d.id]: r.ok }));
      if (!r.ok) setError(`DNS 尚未生效：请在域名解析中添加 _sb-verify.${d.domain} 的 TXT 记录，等待生效后重试`);
      else setError('');
    } catch (e) { setError((e as Error)?.message ?? '检查失败'); }
    finally { setBusy(''); }
  };

  const verify = async (d: Domain) => {
    setBusy(`verify-${d.id}`); setError('');
    try {
      await post(`domains/${d.id}/verify`, {});
      setChecks((c) => ({ ...c, [d.id]: true }));
      await load();
    } catch (e) { setError((e as Error)?.message ?? '验证失败'); }
    finally { setBusy(''); }
  };

  const renewSsl = async (d: Domain) => {
    setBusy(`ssl-${d.id}`); setError('');
    try { await post(`domains/${d.id}/ssl`, {}); await load(); }
    catch (e) { setError((e as Error)?.message ?? 'SSL 签发失败'); }
    finally { setBusy(''); }
  };

  const remove = async (d: Domain) => {
    if (!confirm(`确定解绑域名 ${d.domain}？相关 SSL 证书将被删除。`)) return;
    setBusy(`del-${d.id}`);
    try { await del(`domains/${d.id}`); await load(); }
    catch (e) { setError((e as Error)?.message ?? '删除失败'); }
    finally { setBusy(''); }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div className="dm-wrap">
      <div className="dm-header">
        <div><h1>域名绑定</h1><p>绑定自有域名到站点，通过 DNS 验证所有权并签发 SSL 证书，即可用你的域名访问网站。</p></div>
      </div>

      <div className="dm-add">
        <div className="dm-add-fields">
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">选择站点</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input placeholder="例如 www.example.com" value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="dm-btn primary" disabled={!domain.trim() || !siteId || busy === 'add'} onClick={add}>
            {busy === 'add' ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} 添加域名
          </button>
        </div>
        <p className="dm-tip">输入你的域名（无需 http://），添加后会生成一条 TXT 记录用于验证所有权。</p>
      </div>

      {error && <div className="dm-error"><X size={14} /> {error}</div>}

      {loading ? <div className="dm-empty"><Loader2 size={18} className="spin" /> 加载中…</div>
        : domains.length === 0 ? (
          <div className="dm-empty"><Globe2 size={28} /><p>还没有绑定域名</p><span>在上方输入域名开始绑定</span></div>
        ) : (
          <div className="dm-list">
            {domains.map((d) => {
              const site = sites.find((s) => s.id === d.siteId);
              const sslActive = d.sslStatus === 'active';
              const verified = d.verified || checks[d.id];
              return (
                <div key={d.id} className="dm-card">
                  <div className="dm-card-top">
                    <div className="dm-domain"><Globe2 size={17} /><strong>{d.domain}</strong></div>
                    <div className="dm-badges">
                      <span className={`dm-badge ${verified ? 'ok' : 'wait'}`}>{verified ? '已验证' : '待验证'}</span>
                      <span className={`dm-badge ${sslActive ? 'ok' : 'wait'}`}><ShieldCheck size={12} /> {sslActive ? 'SSL 已签发' : 'SSL 待签发'}</span>
                    </div>
                  </div>

                  <div className="dm-meta">
                    <span>绑定站点：<strong>{site?.name ?? d.siteId.slice(0, 8)}</strong></span>
                    {sslActive && d.sslExpires && <span>证书到期：{new Date(d.sslExpires).toLocaleDateString('zh-CN')}</span>}
                  </div>

                  {!verified && (
                    <div className="dm-verify">
                      <div className="dm-verify-title">请在域名解析（DNS）中添加以下 TXT 记录：</div>
                      <div className="dm-record">
                        <div><span>记录类型</span><code>TXT</code></div>
                        <div><span>主机记录</span>
                          <code>_sb-verify.{d.domain}
                            <button title="复制" onClick={() => copy(`_sb-verify.${d.domain}`, `h-${d.id}`)}>{copied === `h-${d.id}` ? <Check size={12} /> : <Copy size={12} />}</button>
                          </code>
                        </div>
                        <div><span>记录值</span>
                          <code>{d.verifyToken}
                            <button title="复制" onClick={() => copy(d.verifyToken, `v-${d.id}`)}>{copied === `v-${d.id}` ? <Check size={12} /> : <Copy size={12} />}</button>
                          </code>
                        </div>
                      </div>
                      <p className="dm-hint">添加记录后 DNS 生效可能需要几分钟。点击"检查 DNS"确认，或直接"验证并签发"。</p>
                    </div>
                  )}

                  <div className="dm-actions">
                    {!verified && (
                      <>
                        <button className="dm-btn" disabled={busy === `check-${d.id}`} onClick={() => checkDns(d)}>
                          {busy === `check-${d.id}` ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} 检查 DNS
                        </button>
                        <button className="dm-btn primary" disabled={busy === `verify-${d.id}`} onClick={() => verify(d)}>
                          {busy === `verify-${d.id}` ? <Loader2 size={14} className="spin" /> : <KeyRound size={14} />} 验证并签发 SSL
                        </button>
                      </>
                    )}
                    {verified && (
                      <button className="dm-btn" disabled={busy === `ssl-${d.id}`} onClick={() => renewSsl(d)}>
                        {busy === `ssl-${d.id}` ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} 续期 SSL
                      </button>
                    )}
                    <button className="dm-btn" onClick={() => window.open(`http://${d.domain}`, '_blank', 'noopener,noreferrer')} title="访问域名"><ExternalLink size={14} /> 访问</button>
                    <button className="dm-btn danger" disabled={busy === `del-${d.id}`} onClick={() => remove(d)}><Trash2 size={14} /> 解绑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
