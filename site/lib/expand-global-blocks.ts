/**
 * 渲染前增强页面 DSL（均在服务端 SSR 阶段执行）
 * ------------------------------------------------------------------
 * 1. 展开全局组件引用：ref 节点按 id 拉取真实 DslNode，实现改一次全站同步。
 * 2. 注入动态内容：article-list/card-list 若声明 props.source=articles/products，
 *    则从后端拉取已发布数据注入 props.__data，block 渲染时优先用它。
 */
import type { DslNode } from '@sitebuilder/core';
import { getGlobalBlock, getPublishedArticles, getPublicProducts } from './api';

function isRef(node: DslNode): boolean {
  return Boolean(node.ref?.kind === 'global-block' && node.ref.id);
}

export async function expandGlobalBlocks(root: DslNode, tenantSlug?: string): Promise<DslNode> {
  // 懒加载内容数据：只有 DSL 里声明了 source 才请求
  let articlesPromise: ReturnType<typeof getPublishedArticles> | null = null;
  let productsPromise: ReturnType<typeof getPublicProducts> | null = null;
  const needArticles = hasSource(root, 'articles');
  const needProducts = hasSource(root, 'products');

  const visit = async (node: DslNode): Promise<DslNode> => {
    let current = node;
    if (isRef(node)) {
      const block = await getGlobalBlock(node.ref!.id);
      if (block?.node) {
        const source = block.node as unknown as DslNode;
        current = { ...source, id: node.id, ref: node.ref };
      }
    }

    // 注入动态数据（仅公开站、有 tenantSlug 时）
    if (tenantSlug) {
      const source = String(current.props?.source ?? '');
      if (source === 'articles' && (current.type === 'article-list' || current.type === 'news-list')) {
        if (!articlesPromise) articlesPromise = getPublishedArticles(tenantSlug);
        const data = await articlesPromise;
        const categories = new Map((data.categories ?? []).map((c) => [c.id, c.name]));
        const list = (data.articles ?? []).map((a) => ({
          date: a.publishedAt ? new Date(a.publishedAt).toISOString().slice(0, 10) : '',
          category: a.categoryId ? categories.get(a.categoryId) ?? '' : '',
          title: a.title,
          summary: a.summary ?? '',
        }));
        current = { ...current, props: { ...current.props, __data: { kind: 'articles', list } } };
      } else if (source === 'products' && current.type === 'card-list') {
        if (!productsPromise) productsPromise = getPublicProducts(tenantSlug);
        const list = (await productsPromise).map((p) => ({
          image: p.image ?? '',
          title: p.name,
          description: p.description ?? p.category ?? '',
          href: '#',
        }));
        current = { ...current, props: { ...current.props, __data: { kind: 'products', list } } };
      }
    }

    if (!current.children?.length) return current;
    const children = await Promise.all(current.children.map(visit));
    return { ...current, children };
  };
  return visit(root);
}

/** 判断树中是否存在指定 source（用于决定是否发起请求） */
function hasSource(node: DslNode, source: string): boolean {
  if (String(node.props?.source ?? '') === source) return true;
  return (node.children ?? []).some((c) => hasSource(c, source));
}
