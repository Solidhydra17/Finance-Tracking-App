import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { Capacitor } from '@capacitor/core';

import "./index.css";

// In development mode, unregister any stale production service workers
// to prevent cached production builds from intercepting dev server requests.
// Comment this out when commiting to github
if (import.meta.env.DEV) {
    navigator.serviceWorker?.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
            registration.unregister();
        }
    });
    // Also clear any Workbox caches from production builds
    caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => caches.delete(cacheName));
    });
}

// Listen for the SW controllerchange event — fires when a new SW takes over.
// Combined with the reload() in PWAUpdateBanner, this guarantees the page
// refreshes with the new version even if the SW activates asynchronously.
if (!Capacitor.isNativePlatform()) {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            // Avoid infinite reload loops — only reload if we haven't just reloaded
            if (!sessionStorage.getItem('sw-reloading')) {
                sessionStorage.setItem('sw-reloading', '1');
                window.location.reload();
            }
        });

        // Clear the reload guard after the page has fully loaded
        window.addEventListener('load', () => {
            sessionStorage.removeItem('sw-reloading');
        });
    }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

