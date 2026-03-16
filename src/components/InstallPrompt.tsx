/**
 * PWA 安装提示横幅
 * 检测到可安装时在底部显示，关闭后记住不再弹出
 */
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  });
  const theme = useTheme();
  const t = useI18n();

  useEffect(() => {
    if (isInstalled) return;

    // Check if user previously dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Small delay so it doesn't appear immediately on page load
      setTimeout(() => setVisible(true), 3000);
    };

    const appInstalledHandler = () => {
      setIsInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect when app gets installed
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, [isInstalled]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  }, []);

  if (!visible || isInstalled) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-fade-up"
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-sm"
        style={{
          backgroundColor: `${theme.surface}ee`,
          borderColor: theme.border,
        }}
      >
        <span className="text-2xl shrink-0">📱</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: theme.text }}>
            {t.installTitle}
          </div>
          <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
            {t.installDesc}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentEnd})`,
              color: 'white',
            }}
          >
            {t.installButton}
          </button>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer"
            style={{ color: theme.textMuted }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
