/**
 * 扩展功能模块
 * ------------------------------------------------------------------
 * 装修器「模块库」里除基础组件外的实用功能块。
 * 全部为纯展示组件（不使用 React hooks），装修态与发布态共用，
 * 服务端渲染（Next.js App Router）与客户端装修器都能安全使用。
 * 轻交互用原生 HTML（details / radio）实现，无需客户端水合。
 */

import type { CSSProperties } from 'react';
import type { BlockDefinition } from '../core';
import { toCss } from '../core';

const lineProps = (text: string | undefined, fallback = '') => String(text ?? fallback);
const list = (text: string | undefined) => lineProps(text, '').split('\n').map((x) => x.trim()).filter(Boolean);

function Section({ node, title, subtitle, children }: {
  node: { style?: Parameters<typeof toCss>[0] }; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section className="w-full rounded-lg p-5" style={{ ...toCss(node.style), background: node.style?.background ?? 'var(--sb-bg)', color: 'var(--sb-text)' }}>
      <h3 className="text-lg font-bold">{title}</h3>
      {subtitle && <p className="mt-1 text-xs opacity-70">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** 在线视频：嵌入视频地址（优酷 / 腾讯 / B站 iframe 或直链） */
export const videoBlock: BlockDefinition = {
  type: 'video', name: '在线视频', icon: 'PlayCircle', category: '内容',
  defaultProps: { src: '', title: '视频展示', ratio: '16:9', poster: '' },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'src', label: '视频地址', type: 'text', placeholder: 'mp4/webm 直链或 iframe 嵌入地址' },
    { key: 'poster', label: '封面图片', type: 'text', placeholder: 'https://...（可选）' },
    { key: 'ratio', label: '宽高比', type: 'select', options: [{ label: '16:9', value: '16:9' }, { label: '4:3', value: '4:3' }, { label: '1:1', value: '1:1' }] },
  ],
  render: ({ node }) => {
    const p = node.props;
    const src = lineProps(p.src as string);
    const poster = lineProps(p.poster as string);
    const pad = p.ratio === '4:3' ? '75%' : p.ratio === '1:1' ? '100%' : '56.25%';
    const isFile = /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(src) || !/^https?:\/\//.test(src);
    return (
      <Section node={node} title={lineProps(p.title as string, '视频展示')}>
        <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ paddingTop: pad }}>
          {src ? (
            isFile
              ? <video src={src} poster={poster || undefined} controls preload="metadata" playsInline className="absolute inset-0 h-full w-full" />
              : <iframe src={src} title="video" className="absolute inset-0 h-full w-full" allowFullScreen />
          ) : <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">请在属性面板填写视频地址</div>}
        </div>
      </Section>
    );
  },
};

/** 在线客服：电话 / 微信 / QQ / 邮箱 */
export const serviceBlock: BlockDefinition = {
  type: 'online-service', name: '在线客服', icon: 'Headphones', category: '互动',
  defaultProps: { title: '在线客服', phone: '400-800-8888', wechat: '', qq: '', email: '' },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'phone', label: '电话', type: 'text' },
    { key: 'wechat', label: '微信号', type: 'text' },
    { key: 'qq', label: 'QQ', type: 'text' },
    { key: 'email', label: '邮箱', type: 'text' },
  ],
  render: ({ node }) => {
    const p = node.props;
    const items = [
      { label: '电话咨询', value: p.phone, href: p.phone ? `tel:${p.phone}` : '' },
      { label: '微信', value: p.wechat, href: '' },
      { label: 'QQ', value: p.qq, href: '' },
      { label: '邮箱', value: p.email, href: p.email ? `mailto:${p.email}` : '' },
    ].filter((x) => x.value);
    return (
      <Section node={node} title={lineProps(p.title as string, '在线客服')} subtitle="工作时间 9:00-18:00，欢迎随时咨询">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((x) => x.href
            ? <a key={x.label} href={x.href} className="rounded-lg border border-neutral-200 p-4 text-center text-sm hover:border-[#635BFF]"><div className="text-base font-semibold">{x.label}</div><div className="mt-1 text-xs opacity-70">{String(x.value)}</div></a>
            : <div key={x.label} className="rounded-lg border border-neutral-200 p-4 text-center text-sm"><div className="text-base font-semibold">{x.label}</div><div className="mt-1 text-xs opacity-70">{String(x.value)}</div></div>
          )}
          {!items.length && <p className="text-xs opacity-60 col-span-full">请在属性面板填写联系方式</p>}
        </div>
      </Section>
    );
  },
};

/** 全站搜索 */
export const searchBlock: BlockDefinition = {
  type: 'site-search', name: '全站搜索', icon: 'Search', category: '互动',
  defaultProps: { placeholder: '输入关键词搜索', button: '搜索', action: '' },
  propertySchema: [
    { key: 'placeholder', label: '提示文字', type: 'text' },
    { key: 'button', label: '按钮文字', type: 'text' },
    { key: 'action', label: '搜索结果页地址（留空=当前页带 ?q=）', type: 'text', placeholder: '/s/demo/my-site 或留空' },
  ],
  render: ({ node, editing }) => {
    const p = node.props;
    const action = String(p.action ?? '');
    return (
      <div className="w-full p-4" style={{ ...toCss(node.style), background: node.style?.background ?? 'transparent' }}>
        <form className="flex gap-2" action={editing ? undefined : (action || '?')} method="get" onSubmit={editing ? (e) => e.preventDefault() : undefined}>
          <input
            type="search"
            name="q"
            placeholder={lineProps(p.placeholder as string, '搜索')}
            required
            className="min-w-0 flex-1 rounded-md border border-neutral-200 px-4 py-2 text-sm outline-none focus:border-[var(--sb-accent)]"
          />
          <button type="submit" className="rounded-md px-5 py-2 text-sm font-semibold text-white" style={{ background: 'var(--sb-primary)' }}>{lineProps(p.button as string, '搜索')}</button>
        </form>
        <p className="mt-1.5 text-[10px]" style={{ color: 'var(--sb-muted)' }}>
          {action ? '提交到指定结果页' : '提交后在地址栏生成 ?q= 参数，可用于筛选或对接搜索结果页'}
        </p>
      </div>
    );
  },
};

/** 在线投票（原生 radio，无需 hooks） */
export const voteBlock: BlockDefinition = {
  type: 'vote', name: '在线投票', icon: 'BarChart3', category: '互动',
  defaultProps: { title: '在线投票', options: '选项 A\n选项 B\n选项 C' },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'options', label: '选项（每行一个）', type: 'textarea', rows: 5 },
  ],
  render: ({ node, editing }) => {
    const p = node.props;
    const options = list(p.options as string);
    const name = `vote-${String(node.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
    return (
      <Section node={node} title={lineProps(p.title as string, '在线投票')}>
        <style>{`.${name} input:checked + .dot{border-color:var(--sb-primary);background:var(--sb-accent)}`}</style>
        <div className={name} data-sb-vote={name}>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <label key={i} className="sb-vote-option flex cursor-pointer items-center gap-3 rounded-md border px-4 py-2.5 text-sm" style={{ borderColor: '#E5E7EB' }}>
                <input type="radio" name={name} value={i} className="sr-only" defaultChecked={i === 0} />
                <span className="dot flex h-4 w-4 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: 'var(--sb-primary)' }} />
                <span className="opt-label flex-1">{opt}</span>
                <span className="sb-vote-bar hidden w-24 shrink-0"><span className="sb-vote-fill block h-2 rounded-full" style={{ background: 'var(--sb-accent)' }} /></span>
                <span className="sb-vote-pct hidden w-8 shrink-0 text-right text-xs" style={{ color: 'var(--sb-accent)' }}>0%</span>
              </label>
            ))}
            {!options.length && <p className="text-xs opacity-60">请在属性面板填写选项</p>}
            <button
              type="button"
              onClick={editing ? undefined : (e) => {
                const root = (e.currentTarget as HTMLElement).closest('[data-sb-vote]') as HTMLElement | null;
                if (!root) return;
                const checked = root.querySelector('input[type=radio]:checked') as HTMLInputElement | null;
                if (!checked) return;
                const key = `sb-vote-${root.getAttribute('data-sb-vote')}`;
                const counts: number[] = JSON.parse(localStorage.getItem(key) || '[]');
                const idx = Number(checked.value);
                counts[idx] = (counts[idx] ?? 0) + 1;
                localStorage.setItem(key, JSON.stringify(counts));
                const total = counts.reduce((a, b) => a + (b || 0), 0);
                root.querySelectorAll('.sb-vote-option').forEach((row, i) => {
                  const pct = total ? Math.round(((counts[i] || 0) / total) * 100) : 0;
                  (row.querySelector('.sb-vote-bar') as HTMLElement)?.classList.remove('hidden');
                  (row.querySelector('.sb-vote-pct') as HTMLElement)?.classList.remove('hidden');
                  const fill = row.querySelector('.sb-vote-fill') as HTMLElement;
                  if (fill) fill.style.width = `${pct}%`;
                  const pctEl = row.querySelector('.sb-vote-pct') as HTMLElement;
                  if (pctEl) pctEl.textContent = `${pct}%`;
                });
                (e.currentTarget as HTMLElement).textContent = `已投票 · 共 ${total} 票`;
                (e.currentTarget as HTMLButtonElement).disabled = true;
              }}
              className="mt-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--sb-primary)' }}
            >提交投票</button>
          </div>
        </div>
      </Section>
    );
  },
};

/** 时间轴 */
export const timelineBlock: BlockDefinition = {
  type: 'timeline', name: '时间轴', icon: 'GitCommitVertical', category: '内容',
  defaultProps: { title: '发展历程', items: '2020|公司成立\n2022|业务扩展\n2024|品牌升级' },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    {
      key: 'variant', label: '布局样式', type: 'select',
      options: [
        { label: '纵向时间轴', value: 'normal' }, { label: '横向科技历程', value: 'horizontal' },
      ],
    },
    { key: 'items', label: '节点（年份|内容，每行一个）', type: 'textarea', rows: 5 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const items = list(p.items as string).map((l) => { const [t, ...r] = l.split('|'); return { time: t, text: r.join('|') }; });
    if (p.variant === 'horizontal') {
      return (
        <div style={toCss(node.style)} className="w-full">
          {String(p.title ?? '') && (
            <h3 style={{ margin: '0 0 24px', fontSize: 13, letterSpacing: 4, fontWeight: 700, color: '#22D3EE' }}>{String(p.title)}</h3>
          )}
          <div className="sb-timeline-scroll" style={{ display: 'flex', overflowX: 'auto', padding: '6px 0 20px' }}>
            {items.map((x, i) => (
              <div key={i} style={{ position: 'relative', flex: '1 0 180px', minWidth: 180, padding: '0 12px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 9, height: 2, background: i === items.length - 1 ? 'linear-gradient(90deg,rgba(34,211,238,.55),transparent)' : 'rgba(34,211,238,.55)' }} />
                <div style={{ position: 'relative', width: 20, height: 20, borderRadius: '50%', border: '2px solid #22D3EE', background: '#0B1320', boxShadow: '0 0 16px rgba(34,211,238,.65)', marginBottom: 18 }} />
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, background: 'linear-gradient(100deg,#22D3EE,#34D399)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{x.time}</div>
                <div style={{ marginTop: 10, padding: 16, borderRadius: 12, border: '1px solid rgba(148,163,184,.15)', background: 'linear-gradient(160deg,rgba(23,38,54,.75),rgba(11,19,30,.9))', fontSize: 13, lineHeight: 1.8, color: '#A9BDD0' }}>{x.text}</div>
              </div>
            ))}
          </div>
          {!items.length && <p className="text-xs" style={{ color: 'var(--sb-muted)' }}>请在属性面板填写节点</p>}
          <style>{`.sb-timeline-scroll::-webkit-scrollbar{height:6px}.sb-timeline-scroll::-webkit-scrollbar-thumb{background:rgba(34,211,238,.3);border-radius:3px}`}</style>
        </div>
      );
    }
    return (
      <Section node={node} title={lineProps(p.title as string, '时间轴')}>
        <div className="space-y-4 border-l-2 pl-5" style={{ borderColor: 'var(--sb-primary)' }}>
          {items.map((x, i) => (
            <div key={i} className="relative">
              <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full" style={{ background: 'var(--sb-primary)' }} />
              <div className="text-sm font-semibold">{x.time}</div>
              <div className="mt-1 text-xs opacity-70">{x.text}</div>
            </div>
          ))}
          {!items.length && <p className="text-xs opacity-60">请在属性面板填写节点</p>}
        </div>
      </Section>
    );
  },
};

/** 横向 / 纵向标签：用 radio + CSS 切换，纯展示无 hooks */
function TabsView({ node, vertical }: { node: import('../core').DslNode; vertical?: boolean }) {
  const p = node.props;
  const tabs = list(p.tabs as string).map((l) => { const [t, ...r] = l.split('|'); return { title: t, body: r.join('|') }; });
  const name = `tabs-${node.id}`;
  const inputs = tabs.map((_, i) => `<input type="radio" name="${name}" id="${name}-${i}" class="peer sr-only" ${i === 0 ? 'checked' : ''} />`).join('');
  return (
    <Section node={node} title={lineProps(p.title as string, '标签')}>
      <style>{tabs.map((_, i) => `#${name}-${i}:checked ~ #${name}-bar label[for="${name}-${i}"]{color:var(--sb-primary);border-color:var(--sb-primary)} #${name}-${i}:checked ~ #${name}-panel #${name}-body-${i}{display:block}`).join('')}</style>
      <div dangerouslySetInnerHTML={{ __html: inputs }} />
      <div id={`${name}-bar`} className={vertical ? 'flex w-28 shrink-0 flex-col gap-1' : 'flex gap-1 border-b'} style={{ borderColor: vertical ? undefined : '#E5E7EB' }}>
        {tabs.map((t, i) => <label key={i} htmlFor={`${name}-${i}`} className={`cursor-pointer px-3 py-2 text-sm ${vertical ? 'rounded text-left' : 'border-b-2 border-transparent'}`}>{t.title}</label>)}
      </div>
      <div id={`${name}-panel`} className={`flex-1 pt-4 text-sm`}>
        {tabs.map((t, i) => <div key={i} id={`${name}-body-${i}`} style={{ display: i === 0 ? 'block' : 'none' }}>{t.body}</div>)}
        {!tabs.length && '请在属性面板填写标签内容'}
      </div>
    </Section>
  );
}

export const tabsBlock: BlockDefinition = {
  type: 'tabs', name: '横向标签', icon: 'PanelsTopLeft', category: '布局',
  defaultProps: { title: '标签展示', tabs: '标签一|这里是标签一的内容\n标签二|这里是标签二的内容' },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'tabs', label: '标签（标题|内容，每行一个）', type: 'textarea', rows: 5 },
  ],
  render: ({ node }) => <TabsView node={node} />,
};

export const vtabsBlock: BlockDefinition = {
  type: 'vertical-tabs', name: '纵向标签', icon: 'PanelLeft', category: '布局',
  defaultProps: { title: '标签展示', tabs: '标签一|这里是标签一的内容\n标签二|这里是标签二的内容' },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'tabs', label: '标签（标题|内容，每行一个）', type: 'textarea', rows: 5 },
  ],
  render: ({ node }) => <TabsView node={node} vertical />,
};

/** 手风琴 / 折叠标签：原生 details/summary */
export const accordionBlock: BlockDefinition = {
  type: 'accordion', name: '手风琴', icon: 'ListCollapse', category: '布局',
  defaultProps: { title: '常见问题', items: '问题一？|这里是问题一的答案\n问题二？|这里是问题二的答案' },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'items', label: '内容（标题|答案，每行一个）', type: 'textarea', rows: 5 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const items = list(p.items as string).map((l) => { const [t, ...r] = l.split('|'); return { title: t, body: r.join('|') }; });
    return (
      <Section node={node} title={lineProps(p.title as string, '手风琴')}>
        <div className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {items.map((x, i) => (
            <details key={i} open={i === 0}>
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{x.title}</summary>
              <div className="px-4 pb-3 text-xs opacity-70">{x.body}</div>
            </details>
          ))}
          {!items.length && <p className="p-4 text-xs opacity-60">请在属性面板填写内容</p>}
        </div>
      </Section>
    );
  },
};

/** 滚动公告 */
export const noticeBlock: BlockDefinition = {
  type: 'notice', name: '滚动公告', icon: 'Megaphone', category: '内容',
  defaultProps: { title: '公告', items: '欢迎访问我们的网站\n新版本已上线，欢迎体验' },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'items', label: '公告内容（每行一个）', type: 'textarea', rows: 5 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const items = list(p.items as string);
    const text = items.join('　　●　　') || '请在属性面板填写公告内容';
    return (
      <div className="flex w-full items-center gap-3 rounded-md px-4 py-2.5" style={{ ...toCss(node.style), background: node.style?.background ?? 'rgba(99,91,255,.08)', color: 'var(--sb-text)' }}>
        <span className="shrink-0 text-sm font-semibold" style={{ color: 'var(--sb-primary)' }}>{lineProps(p.title as string, '公告')}</span>
        <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-sm">
          <span style={{ display: 'inline-block', animation: 'sb-marquee 18s linear infinite' }}>{text}</span>
        </div>
        <style>{'@keyframes sb-marquee{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}'}</style>
      </div>
    );
  },
};

/** 动态数字 */
export const counterBlock: BlockDefinition = {
  type: 'number-counter', name: '动态数字', icon: 'Hash', category: '营销',
  defaultProps: { title: '数据展示', items: '服务客户|12800|+\n项目案例|860|+\n团队规模|120|人' },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    {
      key: 'variant', label: '布局样式', type: 'select',
      options: [
        { label: '常规网格', value: 'normal' }, { label: '科技数据条', value: 'strip' },
      ],
    },
    { key: 'items', label: '数据（名称|数字|后缀，每行一个）', type: 'textarea', rows: 5 },
    { key: 'animate', label: '数字滚动动画', type: 'switch' },
  ],
  render: ({ node, editing }) => {
    const p = node.props;
    const items = list(p.items as string).map((l) => { const [name, num, suffix] = l.split('|'); return { name, num, suffix: suffix ?? '' }; });
    const uid = `nc-${String(node.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const animScript = p.animate && !editing ? (
      <script dangerouslySetInnerHTML={{ __html: `(function(){
        var root=document.querySelector('.${uid}');if(!root)return;
        root.querySelectorAll('[data-sb-num]').forEach(function(el){
          var target=parseFloat(el.getAttribute('data-sb-num'))||0;var dur=1200;var start=null;
          function step(ts){if(!start)start=ts;var prog=Math.min(1,(ts-start)/dur);var val=Math.round(target*(1-Math.pow(1-prog,3)));
            el.textContent=target%1?val.toFixed(1):String(val);if(prog<1)requestAnimationFrame(step);}
          el.textContent='0';requestAnimationFrame(step);
        });
      })();` }} />
    ) : null;
    if (p.variant === 'strip') {
      return (
        <div style={toCss(node.style)} className={`w-full ${uid}`}>
          {String(p.title ?? '') && <div style={{ marginBottom: 18, textAlign: 'center', fontSize: 12, letterSpacing: 4, color: '#22D3EE' }}>{String(p.title)}</div>}
          <div className="sb-counter-strip" style={{ display: 'flex', flexWrap: 'wrap', borderRadius: 18, border: '1px solid rgba(34,211,238,.18)', background: 'linear-gradient(120deg,rgba(13,27,42,.96),rgba(9,17,28,.96))', padding: '30px 10px', boxShadow: '0 24px 60px rgba(0,0,0,.35)' }}>
            {items.map((x, i) => (
              <div key={i} className="sb-counter-cell" style={{ flex: '1 1 160px', textAlign: 'center', padding: '6px 18px', borderRight: i < items.length - 1 ? '1px solid rgba(148,163,184,.14)' : 'none' }}>
                <div style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, lineHeight: 1.1, background: 'linear-gradient(100deg,#22D3EE,#34D399)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}><span data-sb-num={x.num.replace(/[^0-9.]/g, '')}>{x.num}</span><span style={{ fontSize: '0.45em', marginLeft: 2 }}>{x.suffix}</span></div>
                <div style={{ marginTop: 8, fontSize: 13, color: '#8FA3B8', letterSpacing: 1 }}>{x.name}</div>
              </div>
            ))}
          </div>
          <style>{`@container(max-width:700px){.sb-counter-cell{border-right:none!important;border-bottom:1px solid rgba(148,163,184,.12)}}`}</style>
          {animScript}
        </div>
      );
    }
    return (
      <Section node={node} title={lineProps(p.title as string, '数据展示')}>
        <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${uid}`}>
          {items.map((x, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--sb-primary)' }}><span data-sb-num={x.num.replace(/[^0-9.]/g, '')}>{x.num}</span>{x.suffix}</div>
              <div className="mt-1 text-xs opacity-70">{x.name}</div>
            </div>
          ))}
          {!items.length && <p className="text-xs opacity-60 col-span-full">请在属性面板填写数据</p>}
          {animScript}
        </div>
      </Section>
    );
  },
};

/** 文件下载 */
export const downloadBlock: BlockDefinition = {
  type: 'download', name: '文件下载', icon: 'Download', category: '内容',
  defaultProps: { title: '资料下载', items: '产品介绍.pdf|/files/intro.pdf\n报价单.xlsx|/files/price.xlsx' },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'items', label: '文件（名称|地址，每行一个）', type: 'textarea', rows: 5 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const items = list(p.items as string).map((l) => { const [name, ...r] = l.split('|'); return { name, href: r.join('|') }; });
    return (
      <Section node={node} title={lineProps(p.title as string, '资料下载')}>
        <div className="space-y-2">
          {items.map((x, i) => <a key={i} href={x.href || '#'} className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-2.5 text-sm hover:border-[#635BFF]"><span>📄 {x.name}</span><span className="text-xs opacity-50">下载 ↓</span></a>)}
          {!items.length && <p className="text-xs opacity-60">请在属性面板填写文件</p>}
        </div>
      </Section>
    );
  },
};

/** 在线地图（嵌入 iframe） */
export const mapBlock: BlockDefinition = {
  type: 'map', name: '在线地图', icon: 'MapPin', category: '内容',
  defaultProps: { title: '联系我们', address: '北京市朝阳区', src: '', height: 320 },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'address', label: '地址', type: 'text' },
    { key: 'src', label: '地图嵌入地址', type: 'text', placeholder: '百度/高德地图 iframe 地址' },
    { key: 'height', label: '高度', type: 'number', min: 120, max: 800 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const src = lineProps(p.src as string);
    return (
      <Section node={node} title={lineProps(p.title as string, '在线地图')} subtitle={lineProps(p.address as string)}>
        <div className="w-full overflow-hidden rounded-lg bg-neutral-100" style={{ height: Number(p.height) || 320 }}>
          {src ? <iframe src={src} title="map" className="h-full w-full" loading="lazy" /> : <div className="flex h-full items-center justify-center text-sm opacity-50">请在属性面板填写地图嵌入地址</div>}
        </div>
      </Section>
    );
  },
};

/** 当前位置（面包屑） */
export const breadcrumbBlock: BlockDefinition = {
  type: 'breadcrumb', name: '当前位置', icon: 'ChevronRight', category: '布局',
  defaultProps: { items: '首页|产品中心|详情页' },
  propertySchema: [{ key: 'items', label: '路径（用 | 分隔）', type: 'text' }],
  render: ({ node }) => (
    <div className="w-full px-4 py-2 text-xs opacity-70" style={{ ...toCss(node.style) }}>
      {lineProps(node.props.items as string, '首页').split('|').map((x, i, arr) => <span key={i}>{x}{i < arr.length - 1 && <span className="mx-2">/</span>}</span>)}
    </div>
  ),
};

/** 锚点导航 */
export const anchorNavBlock: BlockDefinition = {
  type: 'anchor-nav', name: '锚点导航', icon: 'Anchor', category: '布局',
  defaultProps: { items: '关于我们|#about\n产品中心|#products\n联系我们|#contact' },
  propertySchema: [{ key: 'items', label: '锚点（名称|#id，每行一个）', type: 'textarea', rows: 5 }],
  render: ({ node }) => {
    const items = list(node.props.items as string).map((l) => { const [name, ...r] = l.split('|'); return { name, href: r.join('|') || '#' }; });
    return (
      <nav className="flex w-full flex-wrap gap-2 p-3" style={{ ...toCss(node.style) }}>
        {items.map((x, i) => <a key={i} href={x.href} className="rounded-full border border-neutral-200 px-4 py-1.5 text-xs hover:border-[#635BFF]">{x.name}</a>)}
        {!items.length && <p className="text-xs opacity-60">请在属性面板填写锚点</p>}
      </nav>
    );
  },
};

/** 文章分类 / 产品分类 */
function categoryBlock(type: string, name: string, title: string): BlockDefinition {
  return {
    type, name, icon: 'ListFilter', category: '内容',
    defaultProps: { title, items: '分类一\n分类二\n分类三' },
    propertySchema: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'items', label: '分类（每行一个）', type: 'textarea', rows: 5 },
    ],
    render: ({ node }) => {
      const items = list(node.props.items as string);
      return (
        <Section node={node} title={lineProps(node.props.title as string, title)}>
          <div className="flex flex-wrap gap-2">
            {items.map((x, i) => <span key={i} className="rounded-md border border-neutral-200 px-3 py-2 text-sm">{x}</span>)}
            {!items.length && <p className="text-xs opacity-60">请在属性面板填写分类</p>}
          </div>
        </Section>
      );
    },
  };
}
export const articleCategoryBlock = categoryBlock('article-category', '文章分类', '文章分类');
export const productCategoryBlock = categoryBlock('product-category', '产品分类', '产品分类');

/** 图片标签 */
export const imageTabsBlock: BlockDefinition = {
  type: 'image-tabs', name: '图片标签', icon: 'Images', category: '布局',
  defaultProps: { title: '图片展示', items: '标签一|https://placehold.co/600x300\n标签二|https://placehold.co/600x301' },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'items', label: '图片（标签|地址，每行一个）', type: 'textarea', rows: 5 },
  ],
  render: ({ node }) => {
    const items = list(node.props.items as string).map((l) => { const [t, ...r] = l.split('|'); return { title: t, src: r.join('|') }; });
    const name = `imgtabs-${node.id}`;
    return (
      <Section node={node} title={lineProps(node.props.title as string, '图片展示')}>
        <style>{items.map((_, i) => [`#${name}-${i}:checked ~ #${name}-bar label[for="${name}-${i}"]{color:var(--sb-primary);border-color:var(--sb-primary)}`, `#${name}-${i}:checked ~ #${name}-panel #${name}-body-${i}{display:block}`].join('')).join('')}</style>
        <div dangerouslySetInnerHTML={{ __html: items.map((_, i) => `<input type="radio" name="${name}" id="${name}-${i}" class="sr-only" ${i === 0 ? 'checked' : ''} />`).join('') }} />
        <div id={`${name}-bar`} className="flex gap-1 border-b">
          {items.map((x, i) => <label key={i} htmlFor={`${name}-${i}`} className="cursor-pointer px-3 py-2 text-sm">{x.title}</label>)}
        </div>
        <div id={`${name}-panel`} className="pt-4">
          {items.map((x, i) => <div key={i} id={`${name}-body-${i}`} style={{ display: i === 0 ? 'block' : 'none' }}>{x.src ? <img src={x.src} alt={x.title} className="w-full rounded-lg object-cover" /> : <div className="flex h-40 items-center justify-center rounded-lg bg-neutral-100 text-sm opacity-50">请在属性面板填写图片地址</div>}</div>)}
          {!items.length && <p className="text-xs opacity-60">请在属性面板填写图片</p>}
        </div>
      </Section>
    );
  },
};

/** 友情链接 */
export const linksBlock: BlockDefinition = {
  type: 'friend-links', name: '友情链接', icon: 'Link', category: '内容',
  defaultProps: { title: '友情链接', items: '友情链接一|https://example.com\n友情链接二|https://example.org' },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'items', label: '链接（名称|地址，每行一个）', type: 'textarea', rows: 5 },
  ],
  render: ({ node }) => {
    const items = list(node.props.items as string).map((l) => { const [name, ...r] = l.split('|'); return { name, href: r.join('|') || '#' }; });
    return (
      <Section node={node} title={lineProps(node.props.title as string, '友情链接')}>
        <div className="flex flex-wrap gap-3">
          {items.map((x, i) => <a key={i} href={x.href} target="_blank" rel="noreferrer" className="rounded-md border border-neutral-200 px-3 py-2 text-sm hover:border-[#635BFF]">{x.name}</a>)}
          {!items.length && <p className="text-xs opacity-60">请在属性面板填写链接</p>}
        </div>
      </Section>
    );
  },
};

/** 嵌入页面 / 插件代码（iframe） */
export const embedBlock: BlockDefinition = {
  type: 'embed', name: '嵌入页面', icon: 'Code2', category: '高级',
  defaultProps: { title: '嵌入内容', src: '', height: 360 },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'src', label: '页面地址', type: 'text', placeholder: 'https://...' },
    { key: 'height', label: '高度', type: 'number', min: 100, max: 1200 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const src = lineProps(p.src as string);
    return (
      <Section node={node} title={lineProps(p.title as string, '嵌入内容')}>
        <div className="w-full overflow-hidden rounded-lg border border-neutral-200" style={{ height: Number(p.height) || 360 }}>
          {src ? <iframe src={src} title="embed" className="h-full w-full" loading="lazy" /> : <div className="flex h-full items-center justify-center text-sm opacity-50">请在属性面板填写页面地址</div>}
        </div>
      </Section>
    );
  },
};

/** 自定义 HTML + CSS：任意效果的兜底能力，编辑态与发布态均所见即所得 */
export const customHtmlBlock: BlockDefinition = {
  type: 'custom-html', name: '自定义HTML', icon: 'Code', category: '高级',
  defaultProps: {
    html: '<div style="padding:24px;text-align:center"><h2>自定义内容</h2><p>在这里粘贴任意 HTML</p></div>',
    css: '', rawCss: false, iframe: false, height: 900,
  },
  propertySchema: [
    { key: 'html', label: 'HTML 代码', type: 'textarea', rows: 12, placeholder: '<div>...</div>' },
    { key: 'css', label: 'CSS 样式（作用域当前组件）', type: 'textarea', rows: 8, placeholder: '.title{color:red}' },
    { key: 'iframe', label: '沙箱模式（整页复制，样式完全隔离）', type: 'switch' },
    { key: 'height', label: '沙箱高度(px)', type: 'number', min: 200, max: 5000, step: 100 },
    { key: 'rawCss', label: '原样注入 CSS（复制整页时用，不做作用域化）', type: 'switch' },
  ],
  render: ({ node, editing }) => {
    const html = lineProps(node.props.html as string, '');
    const css = lineProps(node.props.css as string, '');
    const cls = `sb-html-${String(node.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
    // 沙箱模式：把 HTML+CSS 组装成完整文档放进 iframe，样式与站点完全隔离，
    // 1:1 还原复制的整页（含 body/html/全局样式），不影响宿主站点其它模块。
    if (node.props.iframe) {
      const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}${css}</style></head><body>${html}</body></html>`;
      return (
        <div style={toCss(node.style)} className="w-full">
          <iframe
            srcDoc={doc}
            title="复制的页面"
            sandbox="allow-same-origin allow-popups"
            style={{ width: '100%', height: Number(node.props.height ?? 900), border: 0, display: 'block' }}
          />
        </div>
      );
    }
    // rawCss：原样注入（整页复制场景，保留 body/html/全局样式与媒体查询）
    // 默认：作用域化 + @media 转 @container，避免影响站内其他模块
    const containerCss = node.props.rawCss ? css : css.replace(/@media\s*\(/g, '@container (');
    return (
      <div
        className={`w-full ${cls}`}
        style={{ ...toCss(node.style), containerType: 'inline-size' } as CSSProperties}
        onClick={editing ? (e) => {
          const el = e.target as HTMLElement;
          if (el.closest('a')) e.preventDefault();
        } : undefined}
      >
        {containerCss && <style>{node.props.rawCss ? containerCss : containerCss.replace(/([^{}]+)\{/g, (sel) => (sel.trim().startsWith('@') ? sel : `.${cls} ${sel}`))}</style>}
        {html
          ? <div dangerouslySetInnerHTML={{ __html: html }} />
          : (
            <div
              className="flex min-h-24 items-center justify-center rounded-lg border border-dashed text-xs"
              style={{ borderColor: '#CBD5E1', color: 'var(--sb-muted)' }}
            >
              {editing ? '请在右侧属性面板填写 HTML 代码' : ''}
            </div>
          )}
      </div>
    );
  },
};

/** 全局组件引用：编辑器画布中的占位块，公开站渲染前由 SiteView 展开为真实节点 */
export const globalBlockRefBlock: BlockDefinition = {
  type: 'global-block-ref', name: '全局组件', icon: 'Package', category: '高级',
  defaultProps: { name: '全局组件' },
  propertySchema: [
    { key: 'name', label: '组件名称', type: 'text' },
    { key: 'refId', label: '全局组件 ID', type: 'text' },
  ],
  render: ({ node, editing }) => (
    <div
      className="w-full rounded-lg border-2 border-dashed p-5 text-center"
      style={{ ...toCss(node.style), borderColor: '#635BFF', background: 'rgba(99,91,255,.04)' }}
    >
      <div className="text-sm font-semibold" style={{ color: '#635BFF' }}>
        ◈ {String(node.props.name ?? '全局组件')}
      </div>
      <p className="mt-1 text-[11px]" style={{ color: 'var(--sb-muted)' }}>
        {editing ? '全局组件 · 公开站将显示最新内容，改一次全站同步' : ''}
      </p>
    </div>
  ),
};

export const advancedBlocks: BlockDefinition[] = [
  videoBlock, serviceBlock, searchBlock, voteBlock, timelineBlock,
  tabsBlock, vtabsBlock, accordionBlock, noticeBlock, counterBlock,
  downloadBlock, mapBlock, breadcrumbBlock, anchorNavBlock,
  articleCategoryBlock, productCategoryBlock, imageTabsBlock,
  linksBlock, embedBlock, customHtmlBlock, globalBlockRefBlock,
];
