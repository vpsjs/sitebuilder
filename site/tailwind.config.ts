import type { Config } from 'tailwindcss';

/**
 * 关键：content 必须包含共享包的源码，
 * 否则共享组件用到的 Tailwind 类名（如 justify-center / text-center）
 * 不会被生成，站点端样式与装修器不一致。
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    '../packages/core/src/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
