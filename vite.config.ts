import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const pkg = require("./package.json");

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
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
            // Cast to 'any' to allow the experimental 'widgets' field
            // which is not yet part of vite-plugin-pwa's ManifestOptions type.
            manifest: ({
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
                widgets: [
                    {
                        name: "KURIPOT Wallet",
                        short_name: "Wallet",
                        description: "Your total balance and account breakdown",
                        tag: "kuripot-wallet-widget",
                        template: "widget-wallet.html",
                        ms_ac_template: "widget-wallet.json",
                        data: "/widget-data.json",
                        type: "application/json",
                        screenshots: [{ src: "logo192.png", sizes: "192x192", label: "Wallet Widget" }],
                        icons: [{ src: "logo192.png", sizes: "192x192" }],
                        auth: false,
                        update: "86400"
                    },
                    {
                        name: "KURIPOT Quick Add",
                        short_name: "Quick Add",
                        description: "Log income or expense directly from your home screen",
                        tag: "kuripot-quickadd-widget",
                        template: "widget-quickadd.html",
                        ms_ac_template: "widget-quickadd.json",
                        data: "/widget-data.json",
                        type: "application/json",
                        screenshots: [{ src: "logo192.png", sizes: "192x192", label: "Quick Add Widget" }],
                        icons: [{ src: "logo192.png", sizes: "192x192" }],
                        auth: false,
                        update: "3600"
                    }
                ]
            } as any),
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
    build: {
        rollupOptions: {
            // @capgo/capacitor-widget-kit is Android-native only; it is not
            // installed in the web/Render build. Marking it external prevents
            // Rollup from failing when the package is absent from node_modules.
            // The import in App.tsx is already guarded by Capacitor.isNativePlatform()
            // so this module is never actually executed on web.
            external: ['@capgo/capacitor-widget-kit'],
        },
    },
});
