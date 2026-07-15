import React, { useState, useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

declare const __APP_VERSION__: string;

/**
 * PWA Update Banner (Bottom Sheet Style)
 * Appears when a new service worker is available.
 * Displays current app version, and gives options to update immediately, later,
 * or auto-updates after 5 seconds with a visible countdown.
 */
export const PWAUpdateBanner: React.FC = () => {
    const [dismissed, setDismissed] = useState(false);
    const [countdown, setCountdown] = useState(5);

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

    const isVisible = needRefresh && !dismissed;

    useEffect(() => {
        if (!isVisible) return;

        setCountdown(5); // Reset countdown whenever it becomes visible

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    updateServiceWorker(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [isVisible, updateServiceWorker]);

    if (!isVisible) return null;

    const currentVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.0.0";

    const handleUpdateNow = () => {
        updateServiceWorker(true);
    };

    const handleLater = () => {
        setDismissed(true);
    };

    return (
        <div
            id="pwa-update-banner"
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md animate-slide-up-centered"
        >
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <div className="flex items-start gap-3">
                    {/* Refresh icon */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center mt-0.5">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-5 h-5 text-primary-500 animate-spin-slow"
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
                        <p className="text-sm font-bold text-[var(--text-main)]">
                            Update Available
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                            A new version is available. You are currently on v{currentVersion}.
                        </p>
                        <p className="text-[10px] text-primary-500 font-bold mt-1.5">
                            Updating in {countdown}...
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end pt-1 border-t border-[var(--card-border)]/50 mt-1">
                    <button
                        id="pwa-dismiss-btn"
                        onClick={handleLater}
                        className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors px-4 py-2 rounded-xl bg-transparent active:scale-95"
                    >
                        Later
                    </button>
                    <button
                        id="pwa-reload-btn"
                        onClick={handleUpdateNow}
                        className="text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 active:scale-95 px-5 py-2.5 rounded-xl transition-all shadow-md shadow-primary-500/10"
                    >
                        Update Now
                    </button>
                </div>
            </div>
        </div>
    );
};
