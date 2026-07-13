import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

import "./index.css";

// Service worker registration is handled by vite-plugin-pwa
// via the PWAUpdateBanner component (useRegisterSW hook).

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

