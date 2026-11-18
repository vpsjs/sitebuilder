import type { CSSProperties } from 'react';
import type { TemplatePreviewKind } from '@/templates';

type Props = {
  kind: TemplatePreviewKind;
  cover?: string;
  size?: 'card' | 'detail';
  label?: string;
};

const ACCENTS: Record<TemplatePreviewKind, string> = {
  agency: '#B45309',
  enterprise: '#D4AF37',
  landing: '#D4AF37',
  blank: '#94A3B8',
  generic: '#D4AF37',
};

export function TemplatePreview({ kind, cover, size = 'card', label }: Props) {
  const style = {
    background: cover || '#E5E7EB',
    '--tpl-accent': ACCENTS[kind],
  } as CSSProperties;

  return (
    <div
      className={`tpl-preview tpl-preview-${kind} ${size === 'detail' ? 'tpl-preview-detail' : ''}`}
      style={style}
      role="img"
      aria-label={label ? `${label}模板缩略图` : '模板缩略图'}
    >
      <div className="tpl-browser">
        <div className="tpl-browser-bar">
          <span className="tpl-dot" />
          <span className="tpl-dot" />
          <span className="tpl-dot" />
          <div className="tpl-url" />
        </div>

        <div className="tpl-site">
          {kind === 'blank' ? (
            <div className="tpl-blank">
              <div className="tpl-blank-frame">空白画布</div>
            </div>
          ) : (
            <>
              <div className="tpl-nav">
                <span className="tpl-logo" />
                <span className="tpl-nav-line w1" />
                <span className="tpl-nav-line w2" />
                <span className="tpl-nav-line w3" />
                <span className="tpl-nav-pill" />
              </div>

              {kind === 'agency' && <AgencyBody />}
              {kind === 'enterprise' && <EnterpriseBody />}
              {kind === 'landing' && <LandingBody />}
              {kind === 'generic' && <GenericBody />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AgencyBody() {
  return (
    <>
      <div className="tpl-hero tpl-hero-agency">
        <div className="tpl-hero-copy">
          <span className="tpl-eyebrow">BRAND CREATIVE</span>
          <strong>用创意驱动品牌增长</strong>
          <span className="tpl-hero-line" />
          <span className="tpl-hero-line short" />
        </div>
        <div className="tpl-hero-art">
          <span />
          <span />
        </div>
      </div>
      <div className="tpl-section">
        <div className="tpl-section-title">关于我们 / ABOUT</div>
        <div className="tpl-about">
          <div className="tpl-image-block" />
          <div className="tpl-text-lines">
            <span />
            <span />
            <span className="short" />
          </div>
        </div>
      </div>
      <div className="tpl-cards">
        <span /><span /><span />
      </div>
    </>
  );
}

function EnterpriseBody() {
  return (
    <>
      <div className="tpl-hero tpl-hero-enterprise">
        <span className="tpl-eyebrow">QUALITY · TRUST</span>
        <strong>专注品质 · 成就未来</strong>
        <span className="tpl-hero-line" />
        <span className="tpl-cta">了解我们</span>
      </div>
      <div className="tpl-section">
        <div className="tpl-section-title">我们的服务</div>
        <div className="tpl-cards enterprise">
          <span /><span /><span />
        </div>
      </div>
      <div className="tpl-footer-lines"><span /><span /></div>
    </>
  );
}

function LandingBody() {
  return (
    <>
      <div className="tpl-hero tpl-hero-landing">
        <span className="tpl-eyebrow">LIMITED OFFER</span>
        <strong>让每一次转化都更简单</strong>
        <span className="tpl-hero-line" />
        <span className="tpl-cta">立即领取优惠</span>
      </div>
      <div className="tpl-section">
        <div className="tpl-section-title">为什么选择我们</div>
        <div className="tpl-cards landing">
          <span /><span /><span />
        </div>
      </div>
      <div className="tpl-proof">已有超过 12,000 家企业选择我们</div>
    </>
  );
}

function GenericBody() {
  return (
    <>
      <div className="tpl-hero tpl-hero-generic">
        <span className="tpl-hero-line" />
        <span className="tpl-hero-line short" />
        <span className="tpl-cta">了解更多</span>
      </div>
      <div className="tpl-section">
        <div className="tpl-cards generic">
          <span /><span /><span />
        </div>
      </div>
    </>
  );
}
