/**
 * SlicingScene — 全屏切瓜场景
 *
 * 支持连切 Combo、保底机制、种子品质显示。
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import { rollSlicingResult } from '../slicing/engine';
import { playSliceSound, playSplashSound, playRareDropSound } from '../slicing/audio';
import { ITEM_DEFS } from '../types/slicing';
import type { SlicingResult, ItemId, PityCounter } from '../types/slicing';

interface SlicingSceneProps {
  melonType: 'ripe' | 'legendary';
  comboCount: number;          // 当前是第几连击（从 1 开始）
  canContinue: boolean;        // 是否还有瓜可以继续切
  pity: PityCounter;
  onComplete: (result: SlicingResult) => void;
  onContinue: () => void;      // 继续切下一个
  onCancel: () => void;
}

type Phase = 'ready' | 'slicing' | 'split' | 'drops' | 'result';

interface Particle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  size: number; color: string; opacity: number;
}

interface SeedDrop {
  id: number; x: number; y: number; targetY: number; delay: number;
}

interface ItemDrop {
  id: number; itemId: ItemId; x: number; delay: number; isRare: boolean;
}

const JUICE_COLORS = ['#ff3b3b', '#ff6b6b', '#ff1a1a', '#cc0000', '#ff4d4d'];
const GOLD_JUICE_COLORS = ['#fbbf24', '#f59e0b', '#fde68a', '#d97706', '#fef3c7'];

const SEED_QUALITY_EMOJI = { normal: '🌱', epic: '💎', legendary: '🌟' } as const;
const SEED_QUALITY_COLOR = { normal: '#a3a3a3', epic: '#a78bfa', legendary: '#fbbf24' } as const;

function WholeMelonSvg({ size = 120, isGold }: { size?: number; isGold: boolean }) {
  const baseColor = isGold ? '#fbbf24' : '#2d8a4e';
  const stripeColor = isGold ? '#d97706' : '#1a5c32';
  const highlight = isGold ? '#fde68a' : '#4ade80';

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="56" fill={baseColor} />
      <path d="M60 4 C62 40, 68 80, 60 116" stroke={stripeColor} strokeWidth="5" fill="none" opacity="0.7" />
      <path d="M30 10 C38 40, 44 80, 30 110" stroke={stripeColor} strokeWidth="4" fill="none" opacity="0.5" />
      <path d="M90 10 C82 40, 76 80, 90 110" stroke={stripeColor} strokeWidth="4" fill="none" opacity="0.5" />
      <path d="M15 30 C28 50, 28 70, 15 90" stroke={stripeColor} strokeWidth="3" fill="none" opacity="0.35" />
      <path d="M105 30 C92 50, 92 70, 105 90" stroke={stripeColor} strokeWidth="3" fill="none" opacity="0.35" />
      <ellipse cx="42" cy="35" rx="18" ry="12" fill={highlight} opacity="0.25" transform="rotate(-20 42 35)" />
      <path d="M58 6 C56 0, 62 -2, 64 4" stroke={isGold ? '#92400e' : '#166534'} strokeWidth="2.5" fill="none" />
    </svg>
  );
}

export function SlicingScene({ melonType, comboCount, canContinue, pity, onComplete, onContinue, onCancel }: SlicingSceneProps) {
  const theme = useTheme();
  const t = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>('ready');
  const [sliceAngle, setSliceAngle] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [seeds, setSeeds] = useState<SeedDrop[]>([]);
  const [itemDrops, setItemDrops] = useState<ItemDrop[]>([]);
  const [result, setResult] = useState<SlicingResult | null>(null);
  const [showPerfect, setShowPerfect] = useState(false);
  const [showRareGlow, setShowRareGlow] = useState(false);
  const [comboEffect, setComboEffect] = useState<string | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [goldBurst, setGoldBurst] = useState(false);

  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const hasSwiped = useRef(false);

  // 禁用移动端 pull-to-refresh / 页面滚动
  useEffect(() => {
    const prev = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = 'none';
    return () => { document.body.style.overscrollBehavior = prev; };
  }, []);

  const isGoldMelon = melonType === 'legendary';
  const juiceColors = isGoldMelon ? GOLD_JUICE_COLORS : JUICE_COLORS;

  // 生成汁水粒子
  const spawnParticles = useCallback((cx: number, cy: number, angle: number) => {
    const count = melonType === 'legendary' ? 70 : 45;
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * Math.PI;
      const dir = angle + Math.PI / 2 + spread;
      const speed = 2 + Math.random() * 8;
      newParticles.push({
        id: i,
        x: cx + (Math.random() - 0.5) * 30,
        y: cy + (Math.random() - 0.5) * 30,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        size: 5 + Math.random() * 10,
        color: juiceColors[Math.floor(Math.random() * juiceColors.length)],
        opacity: 1,
      });
    }
    setParticles(newParticles);
  }, [melonType, juiceColors]);

  // 粒子动画
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles(prev => {
        const next = prev
          .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.3, opacity: p.opacity - 0.02 }))
          .filter(p => p.opacity > 0);
        if (next.length === 0) clearInterval(interval);
        return next;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [particles.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // 处理切割
  const handleSlice = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    if (phase !== 'ready' || hasSwiped.current) return;
    hasSwiped.current = true;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 30) { hasSwiped.current = false; return; }

    const angle = Math.atan2(dy, dx);
    setSliceAngle(angle);

    const midX = (startX + endX) / 2;
    const offset = (midX - cx) / (rect.width * 0.15);
    const isPerfect = Math.abs(offset) < 0.1;

    setPhase('slicing');
    playSliceSound();

    // Screen flash + shake
    setScreenFlash(true);
    setShaking(true);
    setTimeout(() => setScreenFlash(false), 150);
    setTimeout(() => setShaking(false), 400);

    setTimeout(() => {
      spawnParticles(cx, cy, angle);
      playSplashSound();

      // Gold burst for legendary
      if (melonType === 'legendary') {
        setGoldBurst(true);
        setTimeout(() => setGoldBurst(false), 600);
      }

      setPhase('split');

      const sliceResult = rollSlicingResult(melonType, isPerfect, comboCount, pity);
      setResult(sliceResult);

      if (isPerfect) {
        setShowPerfect(true);
        setTimeout(() => setShowPerfect(false), 1500);
      }

      // Combo milestone effects
      if (comboCount === 3) {
        setComboEffect(t.comboExpert);
        setTimeout(() => setComboEffect(null), 2000);
      } else if (comboCount === 5) {
        setComboEffect(t.comboGod);
        playRareDropSound();
        setTimeout(() => setComboEffect(null), 2500);
      }

      setTimeout(() => {
        setPhase('drops');
        const seedDrops: SeedDrop[] = [];
        for (let i = 0; i < sliceResult.seeds; i++) {
          seedDrops.push({
            id: i,
            x: cx + (Math.random() - 0.5) * 100,
            y: cy,
            targetY: cy + 60 + Math.random() * 40,
            delay: i * 150,
          });
        }
        setSeeds(seedDrops);

        if (sliceResult.items.length > 0) {
          const hasRare = sliceResult.items.some(id => ITEM_DEFS[id].rarity === 'rare');
          if (hasRare) {
            setShowRareGlow(true);
            playRareDropSound();
          }
          const drops: ItemDrop[] = sliceResult.items.map((itemId, i) => ({
            id: i, itemId,
            x: cx + (i - (sliceResult.items.length - 1) / 2) * 60,
            delay: sliceResult.seeds * 150 + 300 + i * 200,
            isRare: ITEM_DEFS[itemId].rarity === 'rare',
          }));
          setItemDrops(drops);
        }

        const totalDelay = sliceResult.seeds * 150 + 300 + sliceResult.items.length * 200 + 800;
        setTimeout(() => {
          setShowRareGlow(false);
          setPhase('result');
        }, totalDelay);
      }, 800);
    }, 400);
  }, [phase, melonType, comboCount, pity, spawnParticles, t]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (phase !== 'ready') return;
    e.preventDefault();
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, [phase]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (phase !== 'ready') return;
    e.preventDefault();
  }, [phase]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (phase !== 'ready') return;
    e.preventDefault();
    if (!dragStart.current) return;
    const touch = e.changedTouches[0];
    handleSlice(dragStart.current.x, dragStart.current.y, touch.clientX, touch.clientY);
    dragStart.current = null;
  }, [phase, handleSlice]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (phase !== 'ready') return;
    dragStart.current = { x: e.clientX, y: e.clientY };
  }, [phase]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (phase !== 'ready') return;
    if (!dragStart.current) return;
    handleSlice(dragStart.current.x, dragStart.current.y, e.clientX, e.clientY);
    dragStart.current = null;
  }, [phase, handleSlice]);

  const handleCollect = useCallback(() => {
    if (result) onComplete(result);
  }, [result, onComplete]);

  const seedEmoji = result ? SEED_QUALITY_EMOJI[result.seedQuality] : '🌱';
  const seedColor = result ? SEED_QUALITY_COLOR[result.seedQuality] : '#a3a3a3';

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center select-none${shaking ? ' slicing-shake' : ''}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', cursor: phase === 'ready' ? 'crosshair' : 'default', touchAction: 'none', overscrollBehavior: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Screen flash */}
      {screenFlash && (
        <div className="absolute inset-0 z-50 pointer-events-none" style={{
          backgroundColor: 'rgba(255,255,255,0.8)',
          animation: 'flashFade 150ms ease-out forwards',
        }} />
      )}

      {/* Gold burst for legendary */}
      {goldBurst && (
        <div className="absolute inset-0 z-40 pointer-events-none" style={{
          background: 'radial-gradient(circle at center, rgba(251,191,36,0.6) 0%, rgba(251,191,36,0.2) 40%, transparent 70%)',
          animation: 'flashFade 600ms ease-out forwards',
        }} />
      )}
      {/* Combo 计数器 */}
      {comboCount > 1 && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm font-bold z-10"
          style={{
            backgroundColor: comboCount >= 5 ? '#fbbf2430' : comboCount >= 3 ? '#a78bfa30' : 'rgba(255,255,255,0.1)',
            color: comboCount >= 5 ? '#fbbf24' : comboCount >= 3 ? '#a78bfa' : 'rgba(255,255,255,0.7)',
            border: `1px solid ${comboCount >= 5 ? '#fbbf2450' : comboCount >= 3 ? '#a78bfa50' : 'rgba(255,255,255,0.15)'}`,
          }}
        >
          🔪 Combo ×{comboCount}
        </div>
      )}

      {/* 关闭按钮 */}
      {phase === 'ready' && (
        <button
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center z-10"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
        >✕</button>
      )}

      {/* 稀有掉落金光 */}
      {showRareGlow && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at center, rgba(251,191,36,0.3) 0%, transparent 70%)',
          animation: 'pulse 0.5s ease-in-out infinite alternate',
        }} />
      )}

      {/* Combo 里程碑特效 */}
      {comboEffect && (
        <div className="absolute text-3xl font-black z-20" style={{
          color: comboCount >= 5 ? '#fbbf24' : '#a78bfa',
          textShadow: `0 0 30px ${comboCount >= 5 ? 'rgba(251,191,36,0.8)' : 'rgba(167,139,250,0.8)'}`,
          animation: 'perfectPop 2s ease-out forwards',
        }}>
          {comboEffect}
        </div>
      )}

      {/* 西瓜 */}
      <div className="relative transition-all" style={{
        transform: phase === 'slicing' ? 'scale(1.1)' : phase === 'split' || phase === 'drops' ? 'scale(0)' : 'scale(1)',
        opacity: phase === 'result' ? 0 : 1,
        transition: phase === 'slicing' ? 'transform 0.15s ease-out' : 'transform 0.6s ease-in, opacity 0.3s',
      }}>
        {(phase === 'ready' || phase === 'slicing') && <WholeMelonSvg size={120} isGold={isGoldMelon} />}
        {(phase === 'split' || phase === 'drops') && (
          <div className="relative" style={{ fontSize: 100 }}>
            <span className="absolute" style={{
              transform: `rotate(${sliceAngle}rad) translateX(-50px) rotate(-15deg)`,
              transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
              filter: `drop-shadow(0 0 15px ${melonType === 'legendary' ? '#fbbf24' : '#ff3b3b'})`,
            }}>🍉</span>
            <span className="absolute" style={{
              transform: `rotate(${sliceAngle}rad) translateX(50px) rotate(15deg)`,
              transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
              filter: `drop-shadow(0 0 15px ${melonType === 'legendary' ? '#fbbf24' : '#ff3b3b'})`,
            }}>🍉</span>
          </div>
        )}
      </div>

      {/* 刀光引导 */}
      {phase === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-1.5 h-40 rounded-full" style={{
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.9), transparent)',
            boxShadow: '0 0 12px rgba(255,255,255,0.6), 0 0 24px rgba(255,255,255,0.3)',
            animation: 'sliceGuide 2s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* 提示文字 */}
      {phase === 'ready' && (
        <p className="absolute bottom-24 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {t.sliceHint}
        </p>
      )}

      {/* 完美切割特效 */}
      {showPerfect && (
        <div className="absolute text-2xl font-bold" style={{
          color: '#fbbf24', textShadow: '0 0 20px rgba(251,191,36,0.8)',
          animation: 'perfectPop 1.5s ease-out forwards',
        }}>
          {t.slicePerfect}
        </div>
      )}

      {/* 汁水粒子 */}
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full pointer-events-none" style={{
          left: p.x, top: p.y, width: p.size, height: p.size,
          backgroundColor: p.color, opacity: p.opacity, transform: 'translate(-50%, -50%)',
        }} />
      ))}

      {/* 种子弹出 */}
      {seeds.map(s => (
        <div key={s.id} className="absolute pointer-events-none text-2xl" style={{
          left: s.x, top: s.y, transform: 'translate(-50%, -50%)',
          animation: `seedBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${s.delay}ms both`,
        }}>
          {result ? SEED_QUALITY_EMOJI[result.seedQuality] : '🌱'}
        </div>
      ))}

      {/* 道具掉落 */}
      {itemDrops.map(d => (
        <div key={d.id} className="absolute pointer-events-none text-3xl" style={{
          left: d.x, top: '50%', transform: 'translate(-50%, -50%)',
          animation: `itemDrop 1s cubic-bezier(0.34, 1.56, 0.64, 1) ${d.delay}ms both`,
          filter: d.isRare ? 'drop-shadow(0 0 15px rgba(251,191,36,0.8))' : 'none',
        }}>
          {ITEM_DEFS[d.itemId].emoji}
        </div>
      ))}

      {/* 结果卡片 */}
      {phase === 'result' && result && (
        <div
          className="absolute inset-x-4 max-w-sm mx-auto rounded-2xl border p-6 animate-fade-up"
          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          onMouseDown={e => e.stopPropagation()}
          onMouseUp={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-center mb-4" style={{ color: theme.text }}>
            {melonType === 'legendary' ? t.sliceGoldResult : t.sliceResult}
          </h3>

          {/* 种子 */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">{seedEmoji}</span>
            <span className="text-base font-medium" style={{ color: theme.text }}>
              {t.sliceSeedsObtained(result.seeds)}
            </span>
            {result.seedQuality !== 'normal' && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{
                backgroundColor: `${seedColor}20`, color: seedColor,
              }}>
                {t.seedQualityLabel(result.seedQuality)}
              </span>
            )}
          </div>

          {/* 奖励标签 */}
          <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
            {result.isPerfect && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fbbf2420', color: '#fbbf24' }}>
                {t.slicePerfectBonus}
              </span>
            )}
            {result.comboBonus > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#a78bfa20', color: '#a78bfa' }}>
                +{result.comboBonus} Combo
              </span>
            )}
          </div>

          {/* 道具 */}
          {result.items.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {result.items.map((itemId, i) => {
                const def = ITEM_DEFS[itemId];
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{
                    backgroundColor: def.rarity === 'rare' ? '#fbbf2415' : `${theme.accent}08`,
                    border: def.rarity === 'rare' ? '1px solid #fbbf2430' : `1px solid ${theme.border}`,
                  }}>
                    <span className="text-xl">{def.emoji}</span>
                    <span className="text-sm font-medium" style={{ color: theme.text }}>{t.itemName(itemId)}</span>
                    {def.rarity === 'rare' && (
                      <span className="text-xs px-1.5 py-0.5 rounded ml-auto" style={{ backgroundColor: '#fbbf2420', color: '#fbbf24' }}>
                        {t.sliceRare}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 按钮区 */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleCollect}
              className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all"
              style={{ backgroundColor: theme.accent, color: '#fff' }}
            >
              {t.sliceCollect}
            </button>
            {canContinue && (
              <button
                onClick={() => { handleCollect(); setTimeout(onContinue, 50); }}
                className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                style={{ backgroundColor: `${theme.accent}15`, color: theme.accent, border: `1px solid ${theme.accent}30` }}
              >
                {t.sliceContinue}
              </button>
            )}
          </div>
        </div>
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes sliceGuide {
          0%, 100% { opacity: 0.3; transform: translateY(-10px) rotate(-5deg); }
          50% { opacity: 0.8; transform: translateY(10px) rotate(5deg); }
        }
        @keyframes perfectPop {
          0% { transform: scale(0.5); opacity: 0; }
          30% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1) translateY(-40px); opacity: 0; }
        }
        @keyframes seedBounce {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          50% { transform: translate(-50%, -150%) scale(1.2); opacity: 1; }
          70% { transform: translate(-50%, -80%) scale(1); }
          85% { transform: translate(-50%, -110%) scale(1.05); }
          100% { transform: translate(-50%, -90%) scale(1); opacity: 1; }
        }
        @keyframes itemDrop {
          0% { transform: translate(-50%, -200%) scale(0); opacity: 0; }
          40% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
          60% { transform: translate(-50%, -70%) scale(1); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes flashFade {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .slicing-shake {
          animation: shakeAnim 0.4s ease-out;
        }
        @keyframes shakeAnim {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-4px, 2px); }
          20% { transform: translate(4px, -2px); }
          30% { transform: translate(-3px, -3px); }
          40% { transform: translate(3px, 3px); }
          50% { transform: translate(-2px, 1px); }
          60% { transform: translate(2px, -1px); }
          70% { transform: translate(-1px, 2px); }
          80% { transform: translate(1px, -1px); }
        }
      `}</style>
    </div>
  );
}
