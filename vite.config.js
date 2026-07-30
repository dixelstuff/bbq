import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        display: resolve(import.meta.dirname, "display/index.html"),
        host: resolve(import.meta.dirname, "host/index.html"),
        player: resolve(import.meta.dirname, "player/index.html"),
      },
    },
  },
});
