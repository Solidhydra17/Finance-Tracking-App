import React, { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Non-intrusive banner that appears when a new service worker is available.
 * Uses vite-plugin-pwa's useRegisterSW hook with autoUpdate registration.
 * Shows a slide-up toast at the bottom of the screen (above the bottom nav)
 * with a "Reload" action to apply the update immediately.
 */
export const PWAUpdateBanner: React.FC = () => {
    const [dismissed, setDismissed] = useState(false);

    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, registration) {
            // Periodically check for SW updates every 60 minutes
            if (registration) {
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000);
            }
            console.log(`[PWA] SW registered: ${swUrl}`);
        },
        onRegisterError(error) {
            console.error("[PWA] SW registration error:", error);
        },
    });

    if (!needRefresh || dismissed) return null;

    return (
        <div
            id="pwa-update-banner"
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md animate-slide-up-centered"
        >
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                {/* Refresh icon */}
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5 text-primary-500"
                    >
                        <path
                            fillRule="evenodd"
                            d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.07l.312.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.624-2.85a5.5 5.5 0 019.201-2.465l.312.311H11.77a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V3.53a.75.75 0 00-1.5 0v2.07l-.311-.311A7 7 0 002.63 8.43a.75.75 0 001.45.388l.007-.02z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-main)]">
                        Update Available
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                        A new version of KURIPOT is ready
                    </p>
                </div>

                {/* Actions */}
                <button
                    id="pwa-dismiss-btn"
                    onClick={() => setDismissed(true)}
                    className="flex-shrink-0 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] font-medium transition-colors px-2 py-1"
                    aria-label="Dismiss update"
                >
                    Later
                </button>
                <button
                    id="pwa-reload-btn"
                    onClick={() => updateServiceWorker(true)}
                    className="flex-shrink-0 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 active:scale-95 px-4 py-2 rounded-xl transition-all"
                    aria-label="Reload to update"
                >
                    Reload
                </button>
            </div>
        </div>
    );
};
