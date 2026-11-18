/**
 * 发布对话框：登录 → 保存到正确的站点/页面 → 发布 → 显示公开访问地址
 * ------------------------------------------------------------------
 * 从后台带 ?site=&page= 进入时，把 DSL 写回对应的站点首页或页面；
 * 独立打开时沿用「确保一个站点」的演示逻辑。
 */

import { useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, LogIn, Rocket, X } from 'lucide-react';
import {
  createSite, ensureSite, isLoggedIn, login, publicUrl, saveDraft, publishSite,
  type SiteDto,
} from '@/api/client';
import {
  hasRemoteTarget, publishTarget, saveTarget, targetPublicUrl,
  type EditTarget, type TargetInfo,
} from '@/api/target';
import type { PageSchema } from '@/core';

type Stage = 'login' | 'ready' | 'publishing' | 'done' | 'error';

export function PublishDialog({ page, target, targetInfo, onClose }: {
  page: PageSchema;
  target: EditTarget;
  targetInfo: TargetInfo | null;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>(isLoggedIn() ? 'ready' : 'login');
  const [email, setEmail] = useState('user@demo.com');
  const [password, setPassword] = useState('demo123');
  const [message, setMessage] = useState('');
  const [site, setSite] = useState<SiteDto | null>(targetInfo?.site ?? null);
  const [url, setUrl] = useState('');
  const [tenantSlug, setTenantSlug] = useState('demo');

  const remote = hasRemoteTarget(target);
  const isPage = Boolean(target.pageId);

  const doLogin = async () => {
    try {
      setStage('publishing');
      await login(email, password);
      setStage('ready');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '登录失败');
      setStage('login');
    }
  };

  const doPublish = async () => {
    try {
      setStage('publishing');
      if (!isLoggedIn()) await login(email, password);

      let version: number | undefined;
      if (remote) {
        // 后台进入：保存到指定站点首页或页面，并发布到对应目标
        await saveTarget(target, page);
        const result = await publishTarget(target);
        version = result.version;
        setUrl(targetPublicUrl(
          tenantSlug.trim() || 'demo',
          targetInfo?.site?.slug ?? 'my-site',
          targetInfo?.page?.slug,
        ));
      } else {
        // 独立打开：模板预览必须新建站点，普通画布沿用确保站点逻辑
        const title = page.meta.title || '我的站点';
        const targetSite = target.templateId
          ? await createSite(title, makeTemplateSlug(title))
          : await ensureSite(title);
        setSite(targetSite);
        await saveDraft(targetSite.id, page);
        const result = await publishSite(targetSite.id);
        version = result.version;
        setUrl(target.templateId
          ? targetPublicUrl(tenantSlug.trim() || 'demo', targetSite.slug)
          : publicUrl(tenantSlug.trim() || 'demo', targetSite.slug));
      }
      setMessage(`发布成功 · 版本 v${version ?? '-'}`);
      setStage('done');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '发布失败');
      setStage('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[440px] rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
            <Rocket className="h-5 w-5 text-[#A67C1E]" />
            {isPage ? '发布页面' : '发布站点'}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5">
          {stage === 'login' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500">连接到后端以保存并发布。演示账号已预填。</p>
              <Field label="邮箱" value={email} onChange={setEmail} />
              <Field label="密码" value={password} onChange={setPassword} type="password" />
              {message && <p className="text-xs text-red-600">{message}</p>}
              <button
                onClick={doLogin}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#171717] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <LogIn className="h-4 w-4" /> 登录
              </button>
            </div>
          )}

          {(stage === 'ready' || stage === 'publishing') && (
            <div className="space-y-4">
              <div className="rounded-lg bg-neutral-50 p-4 text-sm">
                <div className="flex justify-between py-1"><span className="text-neutral-500">目标</span><span className="font-medium text-neutral-900">{targetInfo?.label ?? page.meta.title}</span></div>
                <div className="flex justify-between py-1"><span className="text-neutral-500">组件节点</span><span className="font-medium text-neutral-900">{countNodes(page.root)}</span></div>
                <div className="flex justify-between py-1"><span className="text-neutral-500">DSL 版本</span><span className="font-medium text-neutral-900">v{page.version}</span></div>
              </div>
              <Field label="租户标识（公开地址前缀）" value={tenantSlug} onChange={setTenantSlug} />
              <p className="text-xs text-neutral-500">将保存草稿到后端，并生成已发布快照与版本记录。发布后公开站点即时生效。</p>
              <button
                onClick={doPublish}
                disabled={stage === 'publishing'}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#D4AF37] py-2.5 text-sm font-semibold text-[#171717] transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {stage === 'publishing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                {stage === 'publishing' ? '发布中…' : '保存并发布'}
              </button>
            </div>
          )}

          {(stage === 'done' || stage === 'error') && (
            <div className="space-y-4">
              <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${stage === 'done' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                {stage === 'done' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{message}</span>
              </div>
              {stage === 'done' && url && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">公开访问地址（无需登录）</label>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-blue-700 hover:border-[#D4AF37]"
                  >
                    <span className="flex-1 break-all">{url}</span>
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </a>
                  <p className="mt-2 text-[11px] text-neutral-400">站点 slug：{site?.slug ?? targetInfo?.site?.slug}</p>
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full rounded-md border border-neutral-200 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                完成
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-neutral-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#D4AF37]"
      />
    </div>
  );
}

function countNodes(node: { children?: unknown[] }): number {
  return 1 + (node.children ?? []).reduce<number>((sum, c) => sum + countNodes(c as { children?: unknown[] }), 0);
}

function makeTemplateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28) || 'template-site';
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}
