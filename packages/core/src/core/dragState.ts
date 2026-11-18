/**
 * 当前拖拽载荷（模块级共享）
 * ------------------------------------------------------------------
 * 浏览器在 dragstart 阶段禁止读取 dataTransfer.getData()，
 * 因此拖拽发起方直接写入此共享状态，放置方同步读取。
 * dataTransfer 仍保留用于跨应用拖放与 dropEffect 设置。
 */

export interface DragPayload {
  blockType?: string;
  nodeId?: string;
}

let current: DragPayload = {};

export function setDragPayload(payload: DragPayload): void {
  current = payload;
}

export function getDragPayload(): DragPayload {
  return current;
}

export function clearDragPayload(): void {
  current = {};
}
