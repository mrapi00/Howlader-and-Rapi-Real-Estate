"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed this session
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem("installDismissed")) return;

    // Android/Chrome: capture the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS: detect Safari on iPhone/iPad
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isInStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isIOS && !isInStandalone) {
      setShowIOSPrompt(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSPrompt(false);
    sessionStorage.setItem("installDismissed", "true");
  };

  if (dismissed) return null;
  if (!deferredPrompt && !showIOSPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900">Install App</h3>
            {showIOSPrompt && !deferredPrompt ? (
              <p className="text-xs text-gray-500 mt-0.5">
                Tap <Share className="w-3 h-3 inline -mt-0.5" /> then <strong>&quot;Add to Home Screen&quot;</strong> to install this app.
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                Add to your home screen for quick access.
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="btn-primary w-full mt-3 py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Install Now
          </button>
        )}
      </div>
    </div>
  );
}
