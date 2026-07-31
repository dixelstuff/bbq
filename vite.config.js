import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { defineConfig } from "vite";

const releaseId = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const releaseOrder = Number(
  execFileSync("git", ["show", "-s", "--format=%ct", "HEAD"], {
    encoding: "utf8",
  }).trim(),
);

export default defineConfig({
  base: "/bbq/",
  define: {
    __BBQ_RELEASE_ID__: JSON.stringify(releaseId),
    __BBQ_RELEASE_ORDER__: JSON.stringify(releaseOrder),
  },
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        host: resolve(import.meta.dirname, "host/index.html"),
        player: resolve(import.meta.dirname, "player/index.html"),
      },
    },
  },
});
