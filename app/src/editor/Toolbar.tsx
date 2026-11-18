/**
 * 顶部工具栏：返回后台、撤销/重做、预览切换、发布、导出 DSL
 */

import { useState } from 'react';
import { ArrowLeft, Code2, Eye, EyeOff, LogIn, Redo2, Rocket, Undo2, User } from 'lucide-react';
import { eventBus, Events } from '@/core';
import { isLoggedIn, logout } from '@/api/client';
import { adminUrl, type EditTarget, type TargetInfo } from '@/api/target';
import type { EditorApi } from './useEditor';
import { PublishDialog } from './PublishDialog';

export function Toolbar({ api, target, targetInfo }: {
  api: EditorApi;
  target: EditTarget;
  targetInfo: TargetInfo | null;
}) {
  const { past, future, preview, page } = api;
  const [showPublish, setShowPublish] = useState(false);
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  const exportDsl = () => {
    const json = JSON.stringify(page, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'page-schema.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const publish = () => {
    // 前端事件总线仍广播，插件可订阅；实际保存/发布由对话框对接后端
    eventBus.emit(Events.SITE_PUBLISHED, { title: page.meta.title });
    setShowPublish(true);
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-white px-3 md:px-5">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <a
          href={adminUrl(target)}
          title="返回管理后台"
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 md:px-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">返回后台</span>
        </a>
        <div className="mx-0.5 hidden h-5 w-px bg-neutral-200 sm:block" />
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#171717] text-sm font-bold text-[#D4AF37]">S</div>
        <div className="hidden md:block">
          <div className="text-sm font-semibold text-neutral-900">SiteBuilder Studio</div>
          <div className="text-[10px] text-neutral-400">可视化建站 · 架构演示</div>
        </div>
        <div className="mx-1 hidden h-5 w-px bg-neutral-200 md:block" />
        <span className="truncate text-xs text-neutral-500">{targetInfo?.label ?? page.meta.title}</span>
        <span className="hidden rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-400 lg:inline">DSL v{page.version}</span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 md:gap-1">
        <button
          onClick={() => {
            if (loggedIn) { logout(); setLoggedIn(false); }
            else setShowPublish(true);
          }}
          title={loggedIn ? '已连接后端，点击退出' : '未连接后端'}
          className="mr-0.5 flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[11px] text-neutral-500 transition-colors hover:bg-neutral-100 md:mr-1 md:px-2"
        >
          {loggedIn ? <User className="h-3.5 w-3.5 text-green-600" /> : <LogIn className="h-3.5 w-3.5" />}
          <span className="hidden lg:inline">{loggedIn ? '已连接' : '未登录'}</span>
        </button>

        <IconButton title="撤销" disabled={past.length === 0} onClick={api.undo} icon={Undo2} />
        <IconButton title="重做" disabled={future.length === 0} onClick={api.redo} icon={Redo2} />

        <div className="mx-0.5 hidden h-5 w-px bg-neutral-200 sm:block" />

        <span className="hidden sm:inline"><IconButton title="导出 DSL" onClick={exportDsl} icon={Code2} /></span>
        <button
          onClick={() => api.setPreview(!preview)}
          title={preview ? '退出预览' : '预览'}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 md:px-3"
        >
          {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="hidden sm:inline">{preview ? '退出预览' : '预览'}</span>
        </button>
        <button
          onClick={publish}
          className="ml-0.5 flex items-center gap-1.5 rounded-md bg-[#D4AF37] px-2.5 py-1.5 text-xs font-semibold text-[#171717] transition-opacity hover:opacity-90 md:ml-1 md:px-3.5"
        >
          <Rocket className="h-4 w-4" />
          <span className="hidden sm:inline">{targetInfo?.page ? '发布页面' : '发布站点'}</span>
        </button>
      </div>

      {showPublish && (
        <PublishDialog
          page={page}
          target={target}
          targetInfo={targetInfo}
          onClose={() => {
            setShowPublish(false);
            setLoggedIn(isLoggedIn());
          }}
        />
      )}
    </header>
  );
}

function IconButton({ title, icon: Icon, onClick, disabled }: {
  title: string; icon: typeof Undo2; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
