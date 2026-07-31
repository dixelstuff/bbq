import { resolve } from "node:path";
import { defineConfig, searchForWorkspaceRoot } from "vite";

export default defineConfig({
  root: resolve(import.meta.dirname, "display"),
  base: "/",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    fs: {
      allow: [searchForWorkspaceRoot(import.meta.dirname)],
    },
  },
});
