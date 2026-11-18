/**
 * 装修器状态管理（useReducer + 撤销/重做）
 * ------------------------------------------------------------------
 * 所有编辑操作封装为 action，页面 Schema 是唯一数据源。
 * 操作历史保存在栈中，支持撤销/重做。
 */

import { useCallback, useReducer } from 'react';
import {
  createEmptyPage,
  DEFAULT_THEME,
  findNode,
  insertNode,
  moveNode,
  removeNode,
  updateNode,
  type DslNode,
  type PageSchema,
} from '@/core';
import { eventBus, Events, registry } from '@/core';

export type Device = 'desktop' | 'tablet' | 'mobile';
export type PanelTab = 'blocks' | 'templates' | 'plugins' | 'theme';

export interface EditorState {
  page: PageSchema;
  selectedId: string | null;
  hoveredId: string | null;
  past: PageSchema[];
  future: PageSchema[];
  device: Device;
  preview: boolean;
  panelTab: PanelTab;
}

type Action =
  | { type: 'LOAD'; page: PageSchema }
  | { type: 'SELECT'; id: string | null }
  | { type: 'HOVER'; id: string | null }
  | { type: 'ADD'; blockType: string; parentId: string; index: number }
  | { type: 'ADD_NODE'; node: DslNode; parentId: string; index: number }
  | { type: 'MOVE'; nodeId: string; parentId: string; index: number }
  | { type: 'MOVE_RELATIVE'; nodeId: string; delta: number }
  | { type: 'PATCH'; id: string; patch: Partial<DslNode> }
  | { type: 'DELETE'; id: string }
  | { type: 'DUPLICATE'; id: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'DEVICE'; device: Device }
  | { type: 'PREVIEW'; value: boolean }
  | { type: 'PANEL_TAB'; tab: PanelTab }
  | { type: 'THEME'; patch: Partial<import('@/core').SiteTheme> };

function commit(state: EditorState, nextPage: PageSchema): EditorState {
  return {
    ...state,
    page: nextPage,
    past: [...state.past.slice(-49), state.page],
    future: [],
  };
}

function newId(): string {
  return `n-${Math.random().toString(36).slice(2, 9)}`;
}

function findParent(root: DslNode, id: string): { parent: DslNode; index: number } | null {
  const children = root.children ?? [];
  const index = children.findIndex((child) => child.id === id);
  if (index >= 0) return { parent: root, index };
  for (const child of children) {
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'LOAD':
      return { ...state, page: action.page, selectedId: null, past: [], future: [] };

    case 'SELECT':
      eventBus.emit(Events.NODE_SELECTED, { id: action.id });
      return { ...state, selectedId: action.id };

    case 'HOVER':
      return { ...state, hoveredId: action.id };

    case 'ADD': {
      const block = registry.get(action.blockType);
      if (!block) return state;
      const node: DslNode = {
        id: newId(),
        type: block.type,
        props: structuredClone(block.defaultProps),
        ...(block.container ? { children: [] } : {}),
      };
      const nextPage = {
        ...state.page,
        root: insertNode(state.page.root, action.parentId, node, action.index),
      };
      return { ...commit(state, nextPage), selectedId: node.id };
    }

    case 'ADD_NODE': {
      const nextPage = {
        ...state.page,
        root: insertNode(state.page.root, action.parentId, action.node, action.index),
      };
      return { ...commit(state, nextPage), selectedId: action.node.id };
    }

    case 'MOVE': {
      if (action.nodeId === action.parentId) return state;
      const nextPage = { ...state.page, root: moveNode(state.page.root, action.nodeId, action.parentId, action.index) };
      return commit(state, nextPage);
    }

    case 'MOVE_RELATIVE': {
      const located = findParent(state.page.root, action.nodeId);
      if (!located || action.nodeId === 'root') return state;
      const target = located.index + action.delta;
      if (target < 0 || target >= (located.parent.children?.length ?? 0)) return state;
      const nextPage = {
        ...state.page,
        root: moveNode(state.page.root, action.nodeId, located.parent.id, target),
      };
      return commit(state, nextPage);
    }

    case 'PATCH': {
      const nextPage = { ...state.page, root: updateNode(state.page.root, action.id, action.patch) };
      return commit(state, nextPage);
    }

    case 'DELETE': {
      const node = findNode(state.page.root, action.id);
      if (action.id === 'root' || !node || node.locked) return state;
      const nextPage = { ...state.page, root: removeNode(state.page.root, action.id) };
      return { ...commit(state, nextPage), selectedId: null };
    }

    case 'DUPLICATE': {
      const node = findNode(state.page.root, action.id);
      if (!node || action.id === 'root' || node.locked) return state;
      const clone = structuredClone(node);
      const reid = (n: DslNode): DslNode => ({ ...n, id: newId(), children: n.children?.map(reid) });
      const cloned = reid(clone);
      const located = findParent(state.page.root, action.id);
      const nextPage = {
        ...state.page,
        root: insertNode(
          state.page.root,
          located?.parent.id ?? 'root',
          cloned,
          located ? located.index + 1 : undefined,
        ),
      };
      return { ...commit(state, nextPage), selectedId: cloned.id };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        page: previous,
        past: state.past.slice(0, -1),
        future: [state.page, ...state.future],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        page: next,
        past: [...state.past, state.page],
        future: state.future.slice(1),
      };
    }

    case 'DEVICE':
      return { ...state, device: action.device };

    case 'PREVIEW':
      return { ...state, preview: action.value, selectedId: action.value ? null : state.selectedId };

    case 'PANEL_TAB':
      return { ...state, panelTab: action.tab };

    case 'THEME': {
      const theme = { ...(state.page.theme ?? DEFAULT_THEME), ...action.patch };
      const nextPage = { ...state.page, theme };
      return commit(state, nextPage);
    }

    default:
      return state;
  }
}

const initialState: EditorState = {
  page: createEmptyPage(),
  selectedId: null,
  hoveredId: null,
  past: [],
  future: [],
  device: 'desktop',
  preview: false,
  panelTab: 'blocks',
};

export function useEditor() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = {
    load: useCallback((page: PageSchema) => dispatch({ type: 'LOAD', page }), []),
    select: useCallback((id: string | null) => dispatch({ type: 'SELECT', id }), []),
    hover: useCallback((id: string | null) => dispatch({ type: 'HOVER', id }), []),
    add: useCallback((blockType: string, parentId: string, index: number) => dispatch({ type: 'ADD', blockType, parentId, index }), []),
    addNode: useCallback((node: DslNode, parentId: string, index: number) => dispatch({ type: 'ADD_NODE', node, parentId, index }), []),
    move: useCallback((nodeId: string, parentId: string, index: number) => dispatch({ type: 'MOVE', nodeId, parentId, index }), []),
    moveRelative: useCallback((nodeId: string, delta: number) => dispatch({ type: 'MOVE_RELATIVE', nodeId, delta }), []),
    patch: useCallback((id: string, patch: Partial<DslNode>) => dispatch({ type: 'PATCH', id, patch }), []),
    remove: useCallback((id: string) => dispatch({ type: 'DELETE', id }), []),
    duplicate: useCallback((id: string) => dispatch({ type: 'DUPLICATE', id }), []),
    undo: useCallback(() => dispatch({ type: 'UNDO' }), []),
    redo: useCallback(() => dispatch({ type: 'REDO' }), []),
    setDevice: useCallback((device: Device) => dispatch({ type: 'DEVICE', device }), []),
    setPreview: useCallback((value: boolean) => dispatch({ type: 'PREVIEW', value }), []),
    setPanelTab: useCallback((tab: PanelTab) => dispatch({ type: 'PANEL_TAB', tab }), []),
    setTheme: useCallback((patch: Partial<import('@/core').SiteTheme>) => dispatch({ type: 'THEME', patch }), []),
  };

  return { ...state, ...actions };
}

export type EditorApi = ReturnType<typeof useEditor>;
