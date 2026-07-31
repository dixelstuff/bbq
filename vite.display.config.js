import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { defineConfig, searchForWorkspaceRoot } from "vite";

const releaseId = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const releaseOrder = Number(
  execFileSync("git", ["show", "-s", "--format=%ct", "HEAD"], {
    encoding: "utf8",
  }).trim(),
);

export default defineConfig({
  root: resolve(import.meta.dirname, "display"),
  publicDir: resolve(import.meta.dirname, "media/audio"),
  base: "/",
  define: {
    __BBQ_RELEASE_ID__: JSON.stringify(releaseId),
    __BBQ_RELEASE_ORDER__: JSON.stringify(releaseOrder),
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    fs: {
      allow: [searchForWorkspaceRoot(import.meta.dirname)],
    },
  },
});
