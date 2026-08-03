import React, { useState, useEffect, useCallback } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Capacitor } from '@capacitor/core';

declare const __APP_VERSION__: string;

export const PWAUpdateBanner: React.FC = () => {
    if (Capacitor.isNativePlatform()) return null;
    const [countdown, setCountdown] = useState(5);

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, registration) {
            if (!registration) return;
            console.log(`[PWA] SW registered: ${swUrl}`);

            // Check for updates every 15 minutes (instead of 60)
            setInterval(() => {
                registration.update();
            }, 15 * 60 * 1000);

            // Check for updates every time the user comes back to the tab
            const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    registration.update();
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            // Also check when the window regains focus (e.g. switching back from another app)
            const handleFocus = () => {
                registration.update();
            };
            window.addEventListener('focus', handleFocus);
        },
        onRegisterError(error) {
            console.error("[PWA] SW registration error:", error);
        },
    });

    // When the user clicks Update Now or the countdown hits 0,
    // call skipWaiting then force a hard reload so the new SW takes control
    const applyUpdate = useCallback(() => {
        // Hide the banner immediately so it doesn't appear stuck
        setNeedRefresh(false);
        updateServiceWorker(true);
        // Force reload after a short delay to ensure the SW has activated
        setTimeout(() => {
            window.location.reload();
        }, 400);
    }, [updateServiceWorker, setNeedRefresh]);

    const isVisible = needRefresh;

    // Auto-update countdown
    useEffect(() => {
        if (!isVisible) return;

        setCountdown(5);

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    applyUpdate();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isVisible, applyUpdate]);

    if (!isVisible) return null;

    const currentVersion =
        typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.0.11";

    return (
        <div
            id="pwa-update-banner"
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md animate-slide-up-centered"
        >
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-midblue/10 flex items-center justify-center mt-0.5">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-5 h-5 text-midblue animate-spin-slow"
                        >
                            <path
                                fillRule="evenodd"
                                d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.07l.312.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.624-2.85a5.5 5.5 0 019.201-2.465l.312.311H11.77a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V3.53a.75.75 0 00-1.5 0v2.07l-.311-.311A7 7 0 002.63 8.43a.75.75 0 001.45.388l.007-.02z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-main)]">
                            Update Available
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                            A new version of KURIPOT is ready. You are on v{currentVersion}.
                        </p>
                        <p className="text-[10px] text-midblue font-bold mt-1.5">
                            Updating in {countdown}s...
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 justify-end pt-1 border-t border-[var(--card-border)]/50 mt-1">
                    <button
                        id="pwa-dismiss-btn"
                        onClick={() => setNeedRefresh(false)}
                        className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors px-4 py-2 rounded-xl bg-transparent active:scale-95"
                    >
                        Later
                    </button>
                    <button
                        id="pwa-reload-btn"
                        onClick={applyUpdate}
                        className="text-xs font-bold text-white bg-midblue hover:bg-midblue/90 active:scale-95 px-5 py-2.5 rounded-xl transition-all shadow-md shadow-midblue/20"
                    >
                        Update Now
                    </button>
                </div>
            </div>
        </div>
    );
};
