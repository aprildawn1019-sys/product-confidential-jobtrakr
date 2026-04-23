import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Ensures static PNGs in /public are served with an explicit
// `Content-Type: image/png` header so embedded preview panes that rely on the
// header (rather than sniffing) can render them. Also disables caching for
// brand assets so regenerated images appear immediately.
function explicitPngHeaders(): Plugin {
  const PNG_PATHS = new Set(["/og-image.png", "/favicon.png", "/screenshot-dashboard.png"]);
  return {
    name: "explicit-png-headers",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url) {
          const url = req.url.split("?")[0];
          if (PNG_PATHS.has(url)) {
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "no-cache, must-revalidate");
            res.setHeader("X-Content-Type-Options", "nosniff");
          }
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url) {
          const url = req.url.split("?")[0];
          if (PNG_PATHS.has(url)) {
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "no-cache, must-revalidate");
            res.setHeader("X-Content-Type-Options", "nosniff");
          }
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), explicitPngHeaders(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
