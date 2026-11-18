import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    host: '0.0.0.0',
  },
  resolve: {
    alias: [
      { find: /^@\/templates$/, replacement: path.resolve(__dirname, "../packages/core/src/templates/index.ts") },
      { find: /^react\/jsx-runtime$/, replacement: path.resolve(__dirname, "node_modules/react/jsx-runtime.js") },
      { find: /^react$/, replacement: path.resolve(__dirname, "node_modules/react") },
      { find: /^react-dom$/, replacement: path.resolve(__dirname, "node_modules/react-dom") },
      { find: /^@\//, replacement: path.resolve(__dirname, "src") + "/" },
    ],
  },
});
