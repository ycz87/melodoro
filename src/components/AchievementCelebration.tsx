/**
 * AchievementCelebration — shows when achievements are unlocked
 * Badge transitions from gray → color with glow + gold particles.
 * Multiple unlocks shown sequentially. Click to dismiss.
 */
import { useState, useEffect, useCallback, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import { SERIES_CONFIG } from '../achievements/types';
import { getAchievementById } from '../achievements/definitions';
import { getBadgeUrl } from '../achievements/badges';

interface AchievementCelebrationProps {
  unlockedIds: string[];
  onComplete: () => void;
  language: string;
}

interface CelebrationParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  angle: number;
  dist: number;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: string) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function createAchievementParticles(seed: string): CelebrationParticle[] {
  const random = createSeededRandom(seed);
  return Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: 50 + (random() - 0.5) * 60,
    y: 40 + (random() - 0.5) * 40,
    size: 2 + random() * 4,
    delay: 0.3 + random() * 0.8,
    angle: random() * 360,
    dist: 40 + random() * 60,
  }));
}

function SingleCelebration({ achievementId, language, onDone }: {
  achievementId: string; language: string; onDone: () => void;
}) {
  const theme = useTheme();
  const i18n = useI18n();
  const celebrationId = useId().replace(/:/g, '');
  const [phase, setPhase] = useState<'gray' | 'reveal' | 'show' | 'exit'>('gray');
  const [imageError, setImageError] = useState(false);
  const def = getAchievementById(achievementId);
  const isZh = language.startsWith('zh');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 300);
    const t2 = setTimeout(() => setPhase('show'), 1100);
    const t3 = setTimeout(() => setPhase('exit'), 3500);
    const t4 = setTimeout(onDone, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  const particles = useMemo(
    () => createAchievementParticles(`${achievementId}-${celebrationId}`),
    [achievementId, celebrationId],
  );

  if (!def) return null;

  const config = SERIES_CONFIG[def.series];
  const name = isZh ? def.nameZh : def.nameEn;
  const desc = isZh ? def.descZh : def.descEn;
  const isRevealed = phase === 'reveal' || phase === 'show';
  const badgeUrl = getBadgeUrl(def.id);
  const canShowImage = !imageError && badgeUrl.length > 0;

  return (
    <div
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center cursor-pointer transition-opacity duration-500 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={() => { setPhase('exit'); setTimeout(onDone, 300); }}
    >
      {/* Glow wave */}
      {isRevealed && (
        <div className="absolute" style={{
          width: 200, height: 200,
          background: `radial-gradient(circle, ${config.color}30 0%, transparent 70%)`,
          animation: 'achievement-glow-expand 0.8s ease-out forwards',
        }} />
      )}

      {/* Badge */}
      <div className="relative" style={{ width: 120, height: 120 }}>
        {/* Gray state */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center transition-all duration-800"
          style={{
            backgroundColor: isRevealed ? 'transparent' : 'rgba(128,128,128,0.3)',
            border: isRevealed ? 'none' : '3px solid rgba(128,128,128,0.4)',
            opacity: isRevealed ? 0 : 1,
            transform: isRevealed ? 'scale(0.8)' : 'scale(1)',
          }}
        >
          {canShowImage ? (
            <img
              src={badgeUrl}
              alt={`${name} badge`}
              className="w-full h-full object-contain"
              style={{ filter: 'grayscale(1) opacity(0.4)' }}
              onError={() => setImageError(true)}
            />
          ) : (
            <span style={{ fontSize: 48, filter: 'grayscale(1) opacity(0.4)' }}>{def.emoji}</span>
          )}
        </div>

        {/* Color state */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center transition-all duration-800"
          style={{
            background: 'transparent',
            opacity: isRevealed ? 1 : 0,
            transform: isRevealed ? 'scale(1)' : 'scale(0.5)',
            boxShadow: isRevealed ? `0 0 40px ${config.color}60, 0 0 80px ${config.color}30` : 'none',
          }}
        >
          {canShowImage ? (
            <img
              src={badgeUrl}
              alt={`${name} badge`}
              className="w-full h-full object-contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <span style={{ fontSize: 48 }}>{def.emoji}</span>
          )}
          <div className="absolute inset-0 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%)',
          }} />
        </div>
      </div>

      {/* Gold particles */}
      {isRevealed && particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: '#fbbf24',
            animation: `achievement-particle 1.2s ease-out ${p.delay}s forwards`,
            '--particle-angle': `${p.angle}deg`,
            '--particle-dist': `${p.dist}px`,
            opacity: 0,
          } as React.CSSProperties}
        />
      ))}

      {/* Text */}
      <div className="mt-6 text-center px-8">
        <div
          className="text-xs font-medium mb-1 transition-opacity duration-500"
          style={{ color: config.color, opacity: phase === 'show' ? 1 : 0 }}
        >
          {i18n.achievementsCelebrationTitle}
        </div>
        <div
          className="text-lg font-bold transition-opacity duration-500"
          style={{ color: theme.text, opacity: phase === 'show' ? 1 : 0 }}
        >
          {name}
        </div>
        {desc && (
          <div
            className="text-sm mt-1 transition-opacity duration-500"
            style={{ color: theme.textMuted, opacity: phase === 'show' ? 1 : 0 }}
          >
            {desc}
          </div>
        )}
      </div>
    </div>
  );
}

export function AchievementCelebration({ unlockedIds, onComplete, language }: AchievementCelebrationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleDone = useCallback(() => {
    if (currentIndex < unlockedIds.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  }, [currentIndex, unlockedIds.length, onComplete]);

  if (currentIndex >= unlockedIds.length) return null;

  return createPortal(
    <SingleCelebration
      key={unlockedIds[currentIndex]}
      achievementId={unlockedIds[currentIndex]}
      language={language}
      onDone={handleDone}
    />,
    document.body,
  );
}
