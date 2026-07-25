import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0"),
    },
    plugins: [
        react(),
        VitePWA({
            registerType: "prompt",
            // Let the plugin inject the <link rel="manifest"> tag and register script
            injectRegister: "auto",
            // Include the existing icons in precache
            includeAssets: ["logo192.png", "logo512.png", "vite.svg"],
            // Use injectManifest so we can run custom SW logic (reminder scheduling)
            strategies: "injectManifest",
            srcDir: "src",
            filename: "sw.ts",
            injectManifest: {
                // Precache all built assets
                globPatterns: [
                    "**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}",
                ],
            },
            // Manifest — replaces public/manifest.json
            manifest: {
                name: "KURIPOT - Finance Tracker",
                short_name: "KURIPOT",
                description:
                    "Personal finance tracking app — budget, track expenses, and manage loans.",
                start_url: "/",
                display: "standalone",
                theme_color: "#285ccc",
                background_color: "#ffffff",
                icons: [
                    {
                        src: "logo192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "logo512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "logo512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
            // Don't generate SW inside Capacitor native builds
            devOptions: {
                enabled: false,
            },
        }),
    ],
    server: {
        host: true,
        allowedHosts: true,
    },
    preview: {
        host: true,
        allowedHosts: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
