/**
 * 应用启动引导
 * ------------------------------------------------------------------
 * 所有能力在此集中注册。新增组件/插件时，只需在这里加一行，
 * 或未来改为扫描插件包自动注册，主程序其余部分零改动。
 */

import { registry, pluginManager } from './core';
import { headingBlock, textBlock, buttonBlock, imageBlock, dividerBlock, spacerBlock } from './blocks/basic';
import { containerBlock } from './blocks/container';
import { analyticsPlugin } from './plugins/analytics';
import { productListBlock, couponBlock, countdownBlock, formBlock } from './blocks/commerce';
import { gridBlock, imageTextBlock, featureListBlock } from './blocks/layout';
import { carouselBlock, navbarBlock, footerBlock } from './blocks/display';
import { cardListBlock, articleListBlock } from './blocks/content';
import { advancedBlocks } from './blocks/advanced';

let booted = false;

export function bootstrap(): void {
  if (booted) return;
  booted = true;

  // 内置组件
  [
    containerBlock,
    headingBlock,
    textBlock,
    buttonBlock,
    imageBlock,
    dividerBlock,
    spacerBlock,
    productListBlock, couponBlock, countdownBlock, formBlock,
    gridBlock, imageTextBlock, featureListBlock,
    carouselBlock, navbarBlock, footerBlock,
    cardListBlock, articleListBlock,
    ...advancedBlocks,
  ].forEach((block) => registry.register(block));

  // 插件（其贡献的组件由 pluginManager 自动注册）
  pluginManager.register(analyticsPlugin);
}
