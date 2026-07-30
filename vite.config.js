import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/bbq/",
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        display: resolve(import.meta.dirname, "display/index.html"),
        host: resolve(import.meta.dirname, "host/index.html"),
        player: resolve(import.meta.dirname, "player/index.html"),
      },
    },
  },
});
