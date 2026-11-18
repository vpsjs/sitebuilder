import { useEffect, useState } from 'react';
import { get, post, put, del } from './api';
import { Plus, Edit3, Trash2, X } from 'lucide-react';

interface Category { id: string; name: string; slug?: string; sortOrder?: number }
interface Article {
  id: string; title: string; summary?: string; content?: string;
  cover?: string; categoryId?: string | null; status: string; publishedAt?: string; createdAt: string;
}

export function ArticleManager() {
  const [tab, setTab] = useState<'articles' | 'categories'>('articles');
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Article | null>(null);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        get<Article[]>('articles'),
        get<Category[]>('articles/categories'),
      ]);
      setArticles(a ?? []);
      setCategories(c ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : '加载失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const catNameOf = (id?: string | null) => categories.find((c) => c.id === id)?.name ?? '未分类';

  // ---------- 分类 CRUD ----------
  const saveCategory = async () => {
    if (!catName.trim()) return;
    try {
      if (editingCat) await put(`articles/categories/${editingCat.id}`, { name: catName.trim() });
      else await post('articles/categories', { name: catName.trim(), sortOrder: categories.length });
      setCatName(''); setEditingCat(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败'); }
  };
  const removeCategory = async (c: Category) => {
    if (!confirm(`删除分类「${c.name}」？该分类下的文章会变为未分类。`)) return;
    try { await del(`articles/categories/${c.id}`); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : '删除失败'); }
  };

  // ---------- 文章 CRUD ----------
  const removeArticle = async (a: Article) => {
    if (!confirm(`删除文章「${a.title}」？`)) return;
    try { await del(`articles/${a.id}`); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : '删除失败'); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>文章管理</h1>
          <p>管理文章分类与内容，使用文章列表模块的站点会自动展示已发布的文章</p>
        </div>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
          <button onClick={() => setTab('articles')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', color: tab === 'articles' ? '#635BFF' : '#64748b', borderBottom: tab === 'articles' ? '2px solid #635BFF' : 'none' }}>文章</button>
          <button onClick={() => setTab('categories')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', color: tab === 'categories' ? '#635BFF' : '#64748b', borderBottom: tab === 'categories' ? '2px solid #635BFF' : 'none' }}>分类</button>
        </div>

        {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 12 }}>{error}</div>}
        {loading ? <div style={{ padding: 24, color: '#94a3b8' }}>加载中…</div> : (

          tab === 'articles' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button className="primary-btn" onClick={() => { setEditing(null); setShowArticleForm(true); }}>
                  <Plus size={15} /> 新增文章
                </button>
              </div>
              {articles.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>暂无文章，点击「新增文章」创建第一篇</div>
              ) : (
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: 10 }}>标题</th>
                      <th style={{ padding: 10 }}>分类</th>
                      <th style={{ padding: 10 }}>状态</th>
                      <th style={{ padding: 10 }}>发布时间</th>
                      <th style={{ padding: 10 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((a) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: 10 }}>{a.title}</td>
                        <td style={{ padding: 10, color: '#64748b' }}>{catNameOf(a.categoryId)}</td>
                        <td style={{ padding: 10 }}>
                          <span style={{ color: a.status === 'published' ? '#16a34a' : '#f59e0b' }}>
                            {a.status === 'published' ? '已发布' : '草稿'}
                          </span>
                        </td>
                        <td style={{ padding: 10, color: '#64748b' }}>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: 10 }}>
                          <button className="icon-btn" title="编辑" onClick={() => { setEditing(a); setShowArticleForm(true); }}><Edit3 size={14} /></button>
                          <button className="icon-btn" title="删除" onClick={() => void removeArticle(a)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="分类名称" className="text-input" onKeyDown={(e) => { if (e.key === 'Enter') void saveCategory(); }} />
                <button className="primary-btn" onClick={() => void saveCategory()}>{editingCat ? '保存修改' : '新增分类'}</button>
                {editingCat && <button onClick={() => { setEditingCat(null); setCatName(''); }}>取消</button>}
              </div>
              {categories.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>暂无分类</div> : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {categories.map((c) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                      <span style={{ flex: 1 }}>{c.name}</span>
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>{c.slug ?? ''}</span>
                      <button className="icon-btn" title="编辑" onClick={() => { setEditingCat(c); setCatName(c.name); }}><Edit3 size={14} /></button>
                      <button className="icon-btn" title="删除" onClick={() => void removeCategory(c)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>

      {showArticleForm && (
        <ArticleForm
          article={editing}
          categories={categories}
          onClose={() => setShowArticleForm(false)}
          onSaved={async () => { setShowArticleForm(false); await load(); }}
        />
      )}
    </>
  );
}

function ArticleForm({ article, categories, onClose, onSaved }: {
  article: Article | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(article?.title ?? '');
  const [summary, setSummary] = useState(article?.summary ?? '');
  const [content, setContent] = useState(article?.content ?? '');
  const [cover, setCover] = useState(article?.cover ?? '');
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? '');
  const [status, setStatus] = useState(article?.status ?? 'published');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!title.trim()) { setError('请填写标题'); return; }
    setSaving(true); setError('');
    try {
      const payload = { title: title.trim(), summary, content, cover, categoryId: categoryId || null, status };
      if (article) await put(`articles/${article.id}`, payload);
      else await post('articles', payload);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败'); setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: 'min(680px,92vw)', maxHeight: '90vh', overflow: 'auto', padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{article ? '编辑文章' : '新增文章'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>标题 *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="text-input" />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>分类</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="text-input">
                <option value="">未分类</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>状态</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-input">
                <option value="published">发布</option>
                <option value="draft">草稿</option>
              </select>
            </label>
          </div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>封面图 URL</span>
            <input value={cover} onChange={(e) => setCover(e.target.value)} className="text-input" placeholder="https://..." />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>摘要</span>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="text-input" rows={2} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>正文</span>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} className="text-input" rows={6} />
          </label>
          {error && <div style={{ color: '#dc2626', fontSize: 12 }}>{error}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={onClose}>取消</button>
          <button className="primary-btn" onClick={() => void save()} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
