"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed the banner
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }

    // Check iOS
    const isIOSDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      // Only show if not dismissed
      if (!localStorage.getItem("pwa-banner-dismissed")) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      localStorage.removeItem("pwa-banner-dismissed");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === "accepted") {
      console.log("User accepted the install prompt");
      setIsInstalled(true);
      localStorage.removeItem("pwa-banner-dismissed");
    }

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setIsDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", "true");
  };

  // Don't show anything if installed or dismissed
  if (isInstalled || isDismissed) return null;

  return (
    <>
      {/* Android/Desktop Install Banner */}
      {showBanner && isInstallable && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:bottom-4 md:w-96 animate-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 shadow-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-2">
                  <Download className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Install BoutiqueOS
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Install for offline access and better performance
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Dismiss install banner"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <button
              onClick={handleInstall}
              className="mt-3 w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Install App
            </button>
          </div>
        </div>
      )}

      {/* iOS Instructions Banner */}
      {isIOS && !isInstalled && !showBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:bottom-4 md:w-96 animate-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 shadow-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-2">
                  <Share className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Install BoutiqueOS
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Tap the Share button then &ldquo;Add to Home Screen&rdquo;
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Dismiss install banner"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}