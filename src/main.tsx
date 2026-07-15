import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

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

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

