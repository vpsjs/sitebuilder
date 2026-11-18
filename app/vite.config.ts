import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      // 共享同构核心：装修器与站点渲染器消费同一份代码
      { find: /^@\/core$/, replacement: path.resolve(__dirname, "../packages/core/src/index.ts") },
      { find: /^@\/templates$/, replacement: path.resolve(__dirname, "../packages/core/src/templates/index.ts") },
      { find: /^@\/bootstrap$/, replacement: path.resolve(__dirname, "../packages/core/src/bootstrap.ts") },
      // 共享包位于 app/ 之外，react 需显式指向本项目的 node_modules
      { find: /^react\/jsx-runtime$/, replacement: path.resolve(__dirname, "node_modules/react/jsx-runtime.js") },
      { find: /^react$/, replacement: path.resolve(__dirname, "node_modules/react") },
      { find: /^react-dom$/, replacement: path.resolve(__dirname, "node_modules/react-dom") },
      { find: /^@\//, replacement: path.resolve(__dirname, "src") + "/" },
    ],
  },
});
