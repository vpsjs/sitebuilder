import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 允许编译 app/ 之外的共享包源码
  transpilePackages: [],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@sitebuilder/core': path.resolve(__dirname, '../packages/core/src/index.ts'),
      // 共享包在 site/ 之外，react 需显式指向本站 node_modules
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      react$: path.resolve(__dirname, 'node_modules/react'),
      'react-dom$': path.resolve(__dirname, 'node_modules/react-dom'),
    };
    return config;
  },
};

export default nextConfig;
