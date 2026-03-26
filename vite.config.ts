import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("mapbox-gl")) {
            return "mapbox-gl";
          }

          if (id.includes("@capacitor/")) {
            return "capacitor";
          }

          if (id.includes("framer-motion")) {
            return "framer-motion";
          }

          if (
            id.includes("react-router") ||
            id.includes("@remix-run/router") ||
            id.includes("@tanstack/react-query") ||
            id.includes("@supabase/")
          ) {
            return "app-core";
          }

          if (id.includes("react-dom") || id.includes("react/") || id.endsWith("\\react.js") || id.endsWith("/react.js")) {
            return "react-vendor";
          }

          if (id.includes("@radix-ui/") || id.includes("cmdk") || id.includes("vaul")) {
            return "ui-vendor";
          }

          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform/resolvers") ||
            id.includes("zod") ||
            id.includes("date-fns")
          ) {
            return "forms-data";
          }

          if (
            id.includes("recharts") ||
            id.includes("canvas-confetti") ||
            id.includes("embla-carousel")
          ) {
            return "experience-vendor";
          }

          if (id.includes("lucide-react")) {
            return "icons";
          }
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
