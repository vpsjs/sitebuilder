import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image as ImageIcon, Film, Upload, Trash2, Copy, Check, X, Search,
  RefreshCw, Loader2, FileVideo, FileImage, HardDrive, Eye,
} from 'lucide-react';
import { get, post, del } from './api';

type MediaKind = 'image' | 'video';

type MediaAsset = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  kind: MediaKind;
  size: string;
  url: string;
  createdAt: string;
};

type Stats = { total: number; images: number; videos: number; bytes: number };

function formatBytes(n: number): string {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

export default function MediaManager() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, images: 0, videos: 0, bytes: 0 });
  const [kind, setKind] = useState<'all' | MediaKind>('all');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const q = new URLSearchParams();
      if (kind !== 'all') q.set('kind', kind);
      if (keyword.trim()) q.set('q', keyword.trim());
      const [list, s] = await Promise.all([
        get<MediaAsset[]>(`media${q.size ? `?${q}` : ''}`),
        get<Stats>('media/stats'),
      ]);
      setItems(list ?? []);
      setStats(s ?? { total: 0, images: 0, videos: 0, bytes: 0 });
    } catch (e) { setError((e as Error)?.message ?? '加载失败'); }
    finally { setLoading(false); }
  }, [kind, keyword]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true); setError('');
    const ok: string[] = [];
    const fail: string[] = [];
    try {
      for (const file of Array.from(files)) {
        try {
          const data = await readAsDataURL(file);
          await post('media', { data, filename: file.name });
          ok.push(file.name);
        } catch (e) { fail.push(`${file.name}: ${(e as Error)?.message ?? '失败'}`); }
      }
      if (ok.length) setError('');
      if (fail.length) setError(`部分失败：${fail.join('；')}`);
      await load();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (item: MediaAsset) => {
    if (!confirm(`确定删除「${item.originalName}」？文件将从存储中一并移除。`)) return;
    try {
      await del(`media/${item.id}`);
      if (preview?.id === item.id) setPreview(null);
      await load();
    } catch (e) { setError((e as Error)?.message ?? '删除失败'); }
  };

  const copyUrl = async (item: MediaAsset) => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(item.id);
      setTimeout(() => setCopied(''), 1600);
    } catch { setError('复制失败，请手动复制'); }
  };

  return (
    <div className="media-wrap">
      <div className="media-header">
        <div>
          <h1>媒体库</h1>
          <p>统一管理您上传的图片与视频，可在装修器中直接引用。</p>
        </div>
        <div className="media-header-actions">
          <button className="dm-btn" onClick={load} title="刷新"><RefreshCw size={15} /></button>
          <button className="dm-btn primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
            {uploading ? '上传中…' : '上传文件'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      <div className="media-stats">
        <div className="media-stat"><div className="ms-icon blue"><ImageIcon size={18} /></div><div><strong>{stats.images}</strong><span>张图片</span></div></div>
        <div className="media-stat"><div className="ms-icon purple"><Film size={18} /></div><div><strong>{stats.videos}</strong><span>个视频</span></div></div>
        <div className="media-stat"><div className="ms-icon amber"><HardDrive size={18} /></div><div><strong>{formatBytes(Number(stats.bytes))}</strong><span>占用空间</span></div></div>
      </div>

      <div className="media-toolbar">
        <div className="media-tabs">
          {([['all', '全部'], ['image', '图片'], ['video', '视频']] as const).map(([value, label]) => (
            <button key={value} className={`media-tab ${kind === value ? 'active' : ''}`} onClick={() => setKind(value)}>{label}</button>
          ))}
        </div>
        <label className="media-search">
          <Search size={15} />
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索文件名" />
        </label>
      </div>

      {error && <div className="dm-error"><X size={15} />{error}</div>}

      {loading ? (
        <div className="loading">加载中…</div>
      ) : items.length === 0 ? (
        <div className="dm-empty">
          <FileImage size={40} />
          <p>媒体库还是空的</p>
          <span>点击「上传文件」添加图片或视频，装修器上传的图片也会自动出现在这里</span>
        </div>
      ) : (
        <div className="media-grid">
          {items.map((item) => (
            <div key={item.id} className="media-card">
              <div className="media-thumb" onClick={() => setPreview(item)} title="点击预览">
                {item.kind === 'image' ? (
                  <img src={item.url} alt={item.originalName} loading="lazy" />
                ) : (
                  <div className="media-video-thumb">
                    <video src={item.url} muted preload="metadata" />
                    <span className="media-play"><Film size={20} /></span>
                  </div>
                )}
              </div>
              <div className="media-card-body">
                <div className="media-name" title={item.originalName}>{item.originalName}</div>
                <div className="media-meta">
                  <span>{formatBytes(Number(item.size))}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="media-card-actions">
                  <button className="media-icon-btn" onClick={() => setPreview(item)} title="预览"><Eye size={14} /></button>
                  <button className="media-icon-btn" onClick={() => copyUrl(item)} title="复制地址">
                    {copied === item.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button className="media-icon-btn danger" onClick={() => remove(item)} title="删除"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setPreview(null); }}>
          <div className="modal media-preview-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h3>{preview.originalName}</h3>
                <p>{formatBytes(Number(preview.size))} · {preview.mimeType}</p>
              </div>
              <button className="modal-close" onClick={() => setPreview(null)} aria-label="关闭"><X size={18} /></button>
            </div>
            <div className="media-preview-body">
              {preview.kind === 'image' ? (
                <img src={preview.url} alt={preview.originalName} />
              ) : (
                <video src={preview.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '60vh' }} />
              )}
            </div>
            <div className="media-preview-footer">
              <code>{preview.url}</code>
              <div className="inline-form">
                <button className="dm-btn" onClick={() => copyUrl(preview)}>
                  {copied === preview.id ? <Check size={14} /> : <Copy size={14} />}
                  {copied === preview.id ? '已复制' : '复制地址'}
                </button>
                <button className="dm-btn danger" onClick={() => remove(preview)}><Trash2 size={14} />删除</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
