/**
 * 运营组件（有赞/微盟式）
 * ------------------------------------------------------------------
 * 商品列表、优惠券、倒计时 —— 全部走注册表协议，
 * 装修器与公开站点同时获得这些能力，无需改任何现有代码。
 */

import type { BlockDefinition } from '../core';
import { toCss } from '../core';

export const productListBlock: BlockDefinition = {
  type: 'product-list',
  name: '商品列表',
  icon: 'ShoppingBag',
  category: '营销',
  defaultProps: {
    title: '热销商品', count: 3, columns: 3, variant: 'normal',
    items: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600|ALPINE 背包|¥899|#\nhttps://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600|SUMMIT 帐篷|¥1299|#\nhttps://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600|户外工具套装|¥459|#',
  },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'columns', label: '列数', type: 'select', options: [{ label: '2 列', value: '2' }, { label: '3 列', value: '3' }, { label: '4 列', value: '4' }] },
    {
      key: 'variant', label: '布局样式', type: 'select',
      options: [
        { label: '标准卡片', value: 'normal' }, { label: '科技卡片（深色发光）', value: 'modern' },
      ],
    },
    { key: 'items', label: '商品（每行：图片地址|名称|价格|链接）', type: 'textarea', rows: 6 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const cols = Number(p.columns ?? 3);
    const count = Number(p.count ?? 99);
    const modern = p.variant === 'modern';
    const products = String(p.items ?? '')
      .split('\n').map((l) => l.trim()).filter(Boolean)
      .map((line) => {
        const [image, name, price, href] = line.split('|');
        return { image: (image ?? '').trim(), name: (name ?? '商品').trim(), price: (price ?? '').trim(), href: (href ?? '').trim() };
      })
      .slice(0, count || 99);
    return (
      <div style={toCss(node.style)} className="w-full">
        {String(p.title ?? '') && (
          <h3 className="mb-4 text-lg font-bold" style={{ color: modern ? '#E6EDF3' : 'var(--sb-text)' }}>{String(p.title)}</h3>
        )}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {products.map((item, i) => {
            const inner = (
              <>
                <div className="relative aspect-square overflow-hidden" style={{ background: '#F1F5F9' }}>
                  {item.image
                    ? <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                    : <div className="flex h-full items-center justify-center text-xs" style={{ color: '#94A3B8' }}>商品图</div>}
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-medium" style={{ color: modern ? '#E6EDF3' : 'var(--sb-text)' }}>{item.name}</div>
                  <div className="mt-1 text-base font-bold" style={{ color: 'var(--sb-accent)' }}>{item.price}</div>
                </div>
              </>
            );
            const cardStyle = modern
              ? { border: '1px solid rgba(148,163,184,.16)', background: 'linear-gradient(160deg,rgba(23,38,54,.8),rgba(11,19,30,.92))', borderRadius: 14, overflow: 'hidden' }
              : { border: '1px solid #E5E7EB', background: 'var(--sb-bg)', borderRadius: 8, overflow: 'hidden' };
            return item.href
              ? <a key={i} href={item.href} className="sb-product-card block transition-transform duration-300 hover:-translate-y-1" style={cardStyle}>{inner}</a>
              : <div key={i} className="sb-product-card transition-transform duration-300 hover:-translate-y-1" style={cardStyle}>{inner}</div>;
          })}
          {products.length === 0 && (
            <p className="col-span-full text-center text-xs" style={{ color: 'var(--sb-muted)' }}>在属性面板填写商品：图片|名称|价格|链接</p>
          )}
        </div>
      </div>
    );
  },
};

export const couponBlock: BlockDefinition = {
  type: 'coupon-card',
  name: '优惠券',
  icon: 'Ticket',
  category: '营销',
  defaultProps: { name: '新客立减', amount: 100, minAmount: 500, button: '立即领取' },
  propertySchema: [
    { key: 'name', label: '券名称', type: 'text' },
    { key: 'amount', label: '优惠金额', type: 'number', min: 1, step: 10 },
    { key: 'minAmount', label: '满多少可用', type: 'number', min: 0, step: 10 },
    { key: 'button', label: '按钮文字', type: 'text' },
  ],
  render: ({ node }) => {
    const p = node.props;
    return (
      <div style={toCss(node.style)} className="w-full">
        <div className="flex items-center justify-between rounded-lg border-2 border-dashed p-4" style={{ borderColor: 'var(--sb-accent)' }}>
          <div>
            <div className="text-2xl font-bold" style={{ color: 'var(--sb-accent)' }}>¥{Number(p.amount ?? 100)}</div>
            <div className="text-xs" style={{ color: 'var(--sb-muted)' }}>{String(p.name ?? '优惠券')} · 满{Number(p.minAmount ?? 0)}可用</div>
          </div>
          <span className="rounded-full px-5 py-2 text-sm font-semibold" style={{ background: 'var(--sb-accent)', color: 'var(--sb-primary)' }}>
            {String(p.button ?? '立即领取')}
          </span>
        </div>
      </div>
    );
  },
};

export const countdownBlock: BlockDefinition = {
  type: 'countdown',
  name: '倒计时',
  icon: 'Timer',
  category: '营销',
  defaultProps: { title: '限时秒杀', deadline: '', hours: 2, minutes: 30, seconds: 0 },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'deadline', label: '截止时间（ISO，如 2027-12-31T23:59）', type: 'text', placeholder: '留空则按下方时分秒持续循环' },
    { key: 'hours', label: '循环时长-小时（仅无截止时间时）', type: 'number', min: 0, max: 72, step: 1 },
    { key: 'minutes', label: '循环时长-分钟', type: 'number', min: 0, max: 59, step: 1 },
    { key: 'seconds', label: '循环时长-秒', type: 'number', min: 0, max: 59, step: 1 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const deadline = String(p.deadline ?? '');
    const loop = (Number(p.hours ?? 0) * 3600 + Number(p.minutes ?? 0) * 60 + Number(p.seconds ?? 0)) || 9000;
    const unit = (id: string, label: string) => (
      <span className="rounded px-2 py-1 text-lg font-bold tabular-nums" style={{ background: 'var(--sb-primary)', color: 'var(--sb-accent)' }}>
        <span data-sb-cd={id}>00</span><small className="ml-0.5 text-[10px] font-normal">{label}</small>
      </span>
    );
    const uid = `cd-${String(node.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
    return (
      <div className="w-full rounded-lg p-4 text-center" style={{ ...toCss(node.style), background: node.style?.background ?? 'var(--sb-bg)' }}>
        <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--sb-text)' }}>{String(p.title ?? '限时秒杀')}</div>
        <div className={`flex justify-center gap-2 ${uid}`} data-sb-deadline={deadline} data-sb-loop={loop}>
          {unit('h', '时')}{unit('m', '分')}{unit('s', '秒')}
        </div>
        <script dangerouslySetInnerHTML={{ __html: `(function(){
          var root=document.querySelector('.${uid}');if(!root)return;
          var deadline=root.getAttribute('data-sb-deadline');var loop=Number(root.getAttribute('data-sb-loop'))||9000;
          var base=deadline?new Date(deadline).getTime():Date.now()+loop*1000;
          function tick(){var left=Math.max(0,Math.floor((base-Date.now())/1000));
            if(!deadline&&left<=0){base=Date.now()+loop*1000;left=loop;}
            var h=Math.floor(left/3600),m=Math.floor(left%3600/60),s=left%60;
            ['h','m','s'].forEach(function(k,i){var el=root.querySelector('[data-sb-cd='+k+']');if(el)el.textContent=String([h,m,s][i]).padStart(2,'0');});
          }tick();setInterval(tick,1000);
        })();` }} />
      </div>
    );
  },
};

/** 表单组件：发布后访客提交进入 form_submissions 表 */
export const formBlock: BlockDefinition = {
  type: 'contact-form',
  name: '表单',
  icon: 'ClipboardList',
  category: '表单',
  defaultProps: { title: '联系我们', description: '留下您的信息，我们会尽快联系您', button: '提交', formId: 'contact' },
  propertySchema: [
    { key: 'formId', label: '表单标识', type: 'text' },
    { key: 'title', label: '标题', type: 'text' },
    { key: 'description', label: '描述', type: 'text' },
    { key: 'button', label: '按钮文字', type: 'text' },
  ],
  render: ({ node, editing }) => {
    const p = node.props;
    const title = String(p.title ?? '联系我们');
    const description = String(p.description ?? '');
    const button = String(p.button ?? '提交');
    const formId = String(p.formId ?? 'contact');
    const fieldStyle = { borderColor: '#E5E7EB', background: 'var(--sb-bg)', color: 'var(--sb-text)' };
    return (
      <div className="w-full rounded-lg border p-5" style={{ ...toCss(node.style), borderColor: '#E5E7EB', background: node.style?.background ?? 'var(--sb-bg)' }}>
        <h3 className="text-lg font-bold" style={{ color: 'var(--sb-text)' }}>{title}</h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--sb-muted)' }}>{description}</p>
        {editing ? (
          <>
            <div className="mt-4 space-y-2">
              <input placeholder="您的姓名" disabled className="w-full rounded border px-3 py-2 text-sm" style={fieldStyle} />
              <input placeholder="联系电话" disabled className="w-full rounded border px-3 py-2 text-sm" style={fieldStyle} />
              <textarea placeholder="留言内容" rows={2} disabled className="w-full rounded border px-3 py-2 text-sm" style={fieldStyle} />
              <button className="w-full rounded py-2 text-sm font-semibold" style={{ background: 'var(--sb-accent)', color: 'var(--sb-primary)' }}>{button}</button>
            </div>
            <p className="mt-2 text-[10px] text-neutral-400">发布后访客提交的数据可在后台「表单留言」查看</p>
          </>
        ) : (
          <form action="/api/forms/submit" method="post" className="mt-4 space-y-2">
            <input type="hidden" name="formId" value={formId} />
            <input name="name" required placeholder="您的姓名" className="w-full rounded border px-3 py-2 text-sm" style={fieldStyle} />
            <input name="phone" required placeholder="联系电话" className="w-full rounded border px-3 py-2 text-sm" style={fieldStyle} />
            <textarea name="message" required rows={2} placeholder="留言内容" className="w-full rounded border px-3 py-2 text-sm" style={fieldStyle} />
            <button type="submit" className="w-full rounded py-2 text-sm font-semibold" style={{ background: 'var(--sb-accent)', color: 'var(--sb-primary)' }}>{button}</button>
          </form>
        )}
      </div>
    );
  },
};
