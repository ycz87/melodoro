/**
 * 使用说明弹窗 — 首次访问自动弹出，之后通过设置页手动打开
 */
import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import { GrowthIcon } from './GrowthIcon';

interface GuideProps {
  onClose: () => void;
}

function Guide({ onClose }: GuideProps) {
  const theme = useTheme();
  const t = useI18n();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative max-w-sm w-full rounded-2xl p-6 shadow-2xl animate-fade-up max-h-[80vh] overflow-y-auto"
        style={{ backgroundColor: theme.surface, color: theme.text }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">{t.guideTitle}</h2>

        <div className="space-y-4 text-sm" style={{ color: theme.textMuted }}>
          <section>
            <h3 className="font-medium mb-1" style={{ color: theme.text }}>{t.guidePomodoro}</h3>
            <p>{t.guidePomodoroDesc}</p>
          </section>

          <section>
            <h3 className="font-medium mb-1" style={{ color: theme.text }}>{t.guideBasic}</h3>
            <ul className="space-y-1 list-disc list-inside">
              {t.guideBasicItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="font-medium mb-1" style={{ color: theme.text }}>{t.guideGrowth}</h3>
            <p>{t.guideGrowthDesc}</p>
            <div className="flex flex-col gap-1.5 mt-2">
              {(['seed', 'sprout', 'bloom', 'green', 'ripe'] as const).map((stage, i) => (
                <div key={stage} className="flex items-center gap-2">
                  <GrowthIcon stage={stage} size={18} />
                  <span>{t.guideGrowthStages[i]}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-medium mb-1" style={{ color: theme.text }}>{t.guideSettings}</h3>
            <p>{t.guideSettingsDesc}</p>
          </section>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
          style={{ backgroundColor: theme.accent, color: 'white' }}
        >
          {t.guideStart}
        </button>
      </div>
    </div>
  );
}

/** 使用说明入口 — 首次自动弹出 + 外部控制 */
export function GuideButton({ externalShow, onExternalClose }: {
  externalShow?: boolean;
  onExternalClose?: () => void;
}) {
  const [showGuide, setShowGuide] = useState(false);

  // 首次访问自动弹出（临时禁用用于截图）
  useEffect(() => {
    const seen = localStorage.getItem('pomodoro-guide-seen');
    if (!seen) {
      // setShowGuide(true); // 临时注释
      localStorage.setItem('pomodoro-guide-seen', '1'); // 直接标记已看过
    }
  }, []);

  const isVisible = showGuide || Boolean(externalShow);

  const handleClose = () => {
    setShowGuide(false);
    localStorage.setItem('pomodoro-guide-seen', '1');
    onExternalClose?.();
  };

  return isVisible ? <Guide onClose={handleClose} /> : null;
}
