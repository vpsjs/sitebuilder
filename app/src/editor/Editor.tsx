/**
 * 装修器主界面
 * ------------------------------------------------------------------
 * 桌面：工具栏 + 左组件面板 + 画布 + 右属性面板（三栏并排）
 * 窄屏：工具栏 + 上方画布 + 下方组件面板（同屏可见，点击即可添加组件）；
 *       选中组件后属性面板从底部弹出，避免三栏拆分导致组件无法加入画布。
 */

import { useEffect, useState } from 'react';
import { bootstrap, createEmptyPage } from '@/core';
import type { PageSchema } from '@/core';
import { loadTargetSchema, readTarget, type EditTarget, type TargetInfo, loadTargetInfo, WEB_ADMIN_URL } from '@/api/target';
import { isLoggedIn, login, listPages, listSites } from '@/api/client';
import { useEditor } from './useEditor';
import { VisualEditor } from './VisualEditor';

// 启动时注册所有组件与插件（幂等）
bootstrap();

export function Editor() {
  const api = useEditor();
  const [target, setTarget] = useState<EditTarget>(() => readTarget());
  const [targetInfo, setTargetInfo] = useState<TargetInfo | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (target.siteId || target.templateId) return;
    let cancelled = false;
    (async () => {
      try {
        if (!isLoggedIn()) await login('user@demo.com', 'demo123');
        const sites = await listSites();
        const checks = await Promise.all(sites.map(async (s) => ({ site: s, count: (await listPages(s.id).catch(() => [])).length })));
        const chosen = checks.find((c) => c.count > 0)?.site ?? sites[0];
        if (!cancelled && chosen) {
          const url = new URL(window.location.href);
          url.searchParams.set('site', chosen.id);
          window.history.replaceState({}, '', url);
          setTarget({ siteId: chosen.id });
        }
      } catch {
        // 后端不可用则保留本地草稿模式
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!target.siteId && !target.templateId) { setStatus('ready'); return; }
    let cancelled = false;
    setStatus('loading');
    Promise.all([loadTargetSchema(target), loadTargetInfo(target)])
      .then(([schema, info]) => {
        if (cancelled) return;
        if (schema) api.load(schema as PageSchema);
        else if (target.templateId) {
          setError('模板不存在或已被删除');
          setStatus('error');
          return;
        } else api.load(createEmptyPage(info?.page?.name ?? info?.label ?? '未命名页面'));
        setTargetInfo(info);
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '加载失败');
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [target]);

  const switchPage = (next: EditTarget) => {
    const url = new URL(window.location.href);
    if (next.siteId) url.searchParams.set('site', next.siteId);
    else url.searchParams.delete('site');
    if (next.pageId) url.searchParams.set('page', next.pageId);
    else url.searchParams.delete('page');
    if (next.templateId) url.searchParams.set('template', next.templateId);
    else url.searchParams.delete('template');
    window.history.pushState({}, '', url);
    setTarget(next);
  };

  if (status === 'loading') {
    return <div className="flex h-screen items-center justify-center bg-neutral-50 text-sm text-neutral-500">正在加载站点…</div>;
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-50">
        <p className="text-sm text-red-600">加载失败：{error}</p>
        <a href={`${WEB_ADMIN_URL}/#/sites`} className="text-sm text-[#A67C1E] underline">返回后台</a>
      </div>
    );
  }

  return <VisualEditor api={api} target={target} targetInfo={targetInfo} onSwitchPage={switchPage} />;
}
