import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

import "./index.css";

// Register manual service worker for offline support
if ('serviceWorker' in navigator) {
    const register = () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.error('SW registration failed:', err);
        });
    };

    if (document.readyState === 'complete') {
        register();
    } else {
        window.addEventListener('load', register);
    }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
