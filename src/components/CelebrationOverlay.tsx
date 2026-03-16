/**
 * CelebrationOverlay — 分阶段庆祝系统 v0.7.1
 *
 * 四层结构：背景灯光 → 收获物特写+光晕 → 前景粒子/礼花 → 鼓励文案
 * 5 个阶段效果递进：seed → sprout → bloom → green → ripe
 *
 * 所有动效纯 CSS animation，用 transform/opacity 做 GPU 加速。
 * 点击任意位置可提前关闭。
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import type { GrowthStage } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import { GrowthIcon } from './GrowthIcon';

interface CelebrationOverlayProps {
  stage: GrowthStage;
  isRipe: boolean;
  onComplete: () => void;
}

// ─── Stage config ───
interface StageConfig {
  particleCount: number;
  duration: number;       // total ms
  enterMs: number;
  exitMs: number;
  iconSize: number;
  glowLayers: number;     // number of glow rings
  glowIntensity: number;  // 0-1
  colors: string[];
  hasFireworks: boolean;
  hasConfetti: boolean;
  hasSpecialEffect: boolean;
}

const STAGE_CONFIG: Record<GrowthStage, StageConfig> = {
  seed: {
    particleCount: 36, duration: 5000, enterMs: 500, exitMs: 700,
    iconSize: 100, glowLayers: 5, glowIntensity: 0.7,
    colors: ['#fbbf24', '#f59e0b'],
    hasFireworks: false, hasConfetti: false, hasSpecialEffect: false,
  },
  sprout: {
    particleCount: 56, duration: 6000, enterMs: 500, exitMs: 700,
    iconSize: 110, glowLayers: 6, glowIntensity: 0.8,
    colors: ['#fbbf24', '#4ade80', '#f59e0b'],
    hasFireworks: false, hasConfetti: false, hasSpecialEffect: false,
  },
  bloom: {
    particleCount: 80, duration: 7000, enterMs: 500, exitMs: 900,
    iconSize: 130, glowLayers: 7, glowIntensity: 0.9,
    colors: ['#fbbf24', '#f59e0b', '#f472b6', '#4ade80'],
    hasFireworks: true, hasConfetti: true, hasSpecialEffect: false,
  },
  green: {
    particleCount: 110, duration: 8500, enterMs: 500, exitMs: 1200,
    iconSize: 150, glowLayers: 8, glowIntensity: 1.0,
    colors: ['#fbbf24', '#f59e0b', '#f472b6', '#a78bfa', '#4ade80'],
    hasFireworks: true, hasConfetti: true, hasSpecialEffect: false,
  },
  ripe: {
    particleCount: 160, duration: 10000, enterMs: 500, exitMs: 1500,
    iconSize: 160, glowLayers: 10, glowIntensity: 1.0,
    colors: ['#fbbf24', '#f59e0b', '#f472b6', '#a78bfa', '#34d399', '#ef4444'],
    hasFireworks: true, hasConfetti: true, hasSpecialEffect: true,
  },
  legendary: {
    particleCount: 200, duration: 14000, enterMs: 600, exitMs: 2000,
    iconSize: 180, glowLayers: 12, glowIntensity: 1.0,
    colors: ['#fbbf24', '#f59e0b', '#fde68a', '#d97706', '#fef3c7', '#ef4444'],
    hasFireworks: true, hasConfetti: true, hasSpecialEffect: true,
  },
};

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

function pickSeeded<T>(items: readonly T[], seed: string): T {
  const random = createSeededRandom(seed);
  return items[Math.floor(random() * items.length)]!;
}

// ─── Particle types ───
type ParticleKind = 'dot' | 'confetti' | 'firework' | 'leaf' | 'petal';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
  rotation: number;
  spin: number;
  kind: ParticleKind;
  delay: number;
}

function generateParticles(stage: GrowthStage, config: StageConfig, seed: string): Particle[] {
  const particles: Particle[] = [];
  const random = createSeededRandom(`${seed}-${stage}`);
  let id = 0;

  const pickColor = (colors: readonly string[]) => colors[Math.floor(random() * colors.length)]!;
  const nextSpin = () => 360 + random() * 360;

  // Base particles (dots / rising for seed, falling for others)
  const baseCount = stage === 'seed' ? config.particleCount
    : Math.floor(config.particleCount * 0.4);

  for (let i = 0; i < baseCount; i++) {
    const isSeed = stage === 'seed';
    particles.push({
      id: id++,
      x: 30 + random() * 40,
      y: isSeed ? 70 + random() * 20 : 10 + random() * 30,
      color: pickColor(config.colors),
      size: 3 + random() * 5,
      angle: isSeed
        ? -Math.PI / 2 + (random() - 0.5) * 0.8
        : Math.PI / 2 + (random() - 0.5) * 1.2,
      speed: isSeed ? 40 + random() * 60 : 50 + random() * 80,
      rotation: random() * 360,
      spin: nextSpin(),
      kind: 'dot',
      delay: random() * 0.6,
    });
  }

  // Leaves (sprout+)
  if (stage === 'sprout' || stage === 'bloom') {
    const leafCount = stage === 'sprout' ? 8 : 5;
    const leafColors = ['#4ade80', '#86efac', '#22c55e'] as const;
    for (let i = 0; i < leafCount; i++) {
      particles.push({
        id: id++,
        x: 10 + random() * 80,
        y: -5 - random() * 15,
        color: pickColor(leafColors),
        size: 8 + random() * 6,
        angle: Math.PI / 2 + (random() - 0.5) * 0.6,
        speed: 80 + random() * 60,
        rotation: random() * 360,
        spin: nextSpin(),
        kind: 'leaf',
        delay: random() * 1.0,
      });
    }
  }

  // Petals (bloom+)
  if (stage === 'bloom' || stage === 'green') {
    const petalCount = stage === 'bloom' ? 10 : 6;
    const petalColors = ['#f472b6', '#fbbf24', '#fb923c', '#fda4af'] as const;
    for (let i = 0; i < petalCount; i++) {
      particles.push({
        id: id++,
        x: 10 + random() * 80,
        y: -5 - random() * 15,
        color: pickColor(petalColors),
        size: 6 + random() * 5,
        angle: Math.PI / 2 + (random() - 0.5) * 0.8,
        speed: 60 + random() * 70,
        rotation: random() * 360,
        spin: nextSpin(),
        kind: 'petal',
        delay: random() * 1.2,
      });
    }
  }

  // Confetti (bloom+)
  if (config.hasConfetti) {
    const confettiCount = stage === 'bloom' ? 8 : stage === 'green' ? 15 : 25;
    for (let i = 0; i < confettiCount; i++) {
      particles.push({
        id: id++,
        x: 10 + random() * 80,
        y: -5 - random() * 20,
        color: pickColor(config.colors),
        size: 5 + random() * 4,
        angle: Math.PI / 2 + (random() - 0.5) * 1.0,
        speed: 70 + random() * 90,
        rotation: random() * 360,
        spin: nextSpin(),
        kind: 'confetti',
        delay: random() * 1.5,
      });
    }
  }

  // Fireworks (bloom+)
  if (config.hasFireworks) {
    const fwCount = stage === 'bloom' ? 4 : stage === 'green' ? 8 : 15;
    for (let i = 0; i < fwCount; i++) {
      particles.push({
        id: id++,
        x: 20 + random() * 60,
        y: 20 + random() * 40,
        color: pickColor(config.colors),
        size: 3 + random() * 3,
        angle: (Math.PI * 2 * i) / fwCount + (random() - 0.5) * 0.5,
        speed: 50 + random() * 70,
        rotation: random() * 360,
        spin: nextSpin(),
        kind: 'firework',
        delay: 0.3 + random() * 1.0,
      });
    }
  }

  return particles;
}

// ─── Ripe special effects ───
type SpecialEffect = 'firework-burst' | 'confetti-storm' | 'melon-drop' | 'melon-roll';
const SPECIAL_EFFECTS: SpecialEffect[] = ['firework-burst', 'confetti-storm', 'melon-drop', 'melon-roll'];

interface FireworkBurst {
  id: number;
  left: number;
  top: number;
  delay: number;
  sparks: Array<{
    id: number;
    color: string;
    angle: number;
    dist: number;
    delay: number;
  }>;
}

interface StormConfettiPiece {
  id: number;
  left: number;
  width: number;
  height: number;
  color: string;
  delay: number;
  duration: number;
}

function createFireworkBursts(seed: string): FireworkBurst[] {
  const random = createSeededRandom(`${seed}-firework-burst`);
  const colors = ['#fbbf24', '#f472b6', '#a78bfa', '#34d399', '#ef4444', '#3b82f6', '#f59e0b', '#ec4899'] as const;

  return Array.from({ length: 5 }, (_, i) => ({
    id: i,
    left: 15 + i * 17,
    top: 20 + (i % 3) * 15,
    delay: 0.3 + i * 0.4,
    sparks: Array.from({ length: 8 }, (_, j) => ({
      id: j,
      color: colors[j]!,
      angle: j * 45,
      dist: 30 + random() * 30,
      delay: 0.3 + i * 0.4,
    })),
  }));
}

function createStormConfetti(seed: string): StormConfettiPiece[] {
  const random = createSeededRandom(`${seed}-confetti-storm`);
  const colors = ['#fbbf24', '#f472b6', '#a78bfa', '#34d399', '#ef4444', '#3b82f6'] as const;

  return Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: random() * 100,
    width: 4 + random() * 5,
    height: 3 + random() * 3,
    color: colors[i % colors.length]!,
    delay: random() * 2,
    duration: 1.5 + random() * 1.5,
  }));
}

function SpecialEffectLayer({ effect, seed }: { effect: SpecialEffect; seed: string }) {
  const bursts = createFireworkBursts(seed);
  const confetti = createStormConfetti(seed);

  switch (effect) {
    case 'firework-burst':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {bursts.map((burst) => (
            <div key={burst.id} className="absolute celeb-firework-burst" style={{
              left: `${burst.left}%`, top: `${burst.top}%`,
              animationDelay: `${burst.delay}s`,
            }}>
              {burst.sparks.map((spark) => (
                <div key={spark.id} className="absolute w-1.5 h-1.5 rounded-full celeb-fw-spark" style={{
                  backgroundColor: spark.color,
                  '--fw-angle': `${spark.angle}deg`,
                  '--fw-dist': `${spark.dist}px`,
                  animationDelay: `${spark.delay}s`,
                } as React.CSSProperties} />
              ))}
            </div>
          ))}
        </div>
      );
    case 'confetti-storm':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confetti.map((piece) => (
            <div key={piece.id} className="absolute celeb-confetti-fall" style={{
              left: `${piece.left}%`,
              top: '-5%',
              width: piece.width,
              height: piece.height,
              backgroundColor: piece.color,
              borderRadius: '1px',
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }} />
          ))}
        </div>
      );
    case 'melon-drop':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="absolute text-2xl celeb-melon-drop" style={{
              left: `${15 + i * 17}%`,
              top: '-10%',
              animationDelay: `${0.5 + i * 0.3}s`,
            }}>🍉</div>
          ))}
        </div>
      );
    case 'melon-roll':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute text-3xl celeb-melon-roll-left" style={{ bottom: '30%', left: '-15%' }}>🍉</div>
          <div className="absolute text-3xl celeb-melon-roll-right" style={{ bottom: '30%', right: '-15%', animationDelay: '0.6s' }}>🍉</div>
        </div>
      );
  }
}

// ─── Background layer per stage ───
function BackgroundLayer({ stage }: { stage: GrowthStage }) {
  const base = 'absolute inset-0 pointer-events-none';

  switch (stage) {
    case 'seed':
      return (
        <div className={base}>
          <div className="absolute inset-0 celeb-bg-breathe" style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 85%, rgba(251,191,36,0.25) 0%, transparent 70%)',
          }} />
        </div>
      );
    case 'sprout':
      return (
        <div className={base}>
          <div className="absolute inset-0 celeb-bg-breathe" style={{
            background: 'radial-gradient(ellipse 40% 70% at 50% 90%, rgba(74,222,128,0.2) 0%, transparent 70%)',
          }} />
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 50% 30% at 50% 80%, rgba(251,191,36,0.1) 0%, transparent 60%)',
          }} />
        </div>
      );
    case 'bloom':
      return (
        <div className={base}>
          <div className="absolute inset-0 celeb-bg-breathe" style={{
            background: `
              radial-gradient(ellipse 35% 60% at 20% 80%, rgba(251,191,36,0.2) 0%, transparent 70%),
              radial-gradient(ellipse 35% 60% at 80% 80%, rgba(251,191,36,0.2) 0%, transparent 70%)
            `,
          }} />
        </div>
      );
    case 'green':
      return (
        <div className={base}>
          <div className="absolute inset-0 celeb-bg-breathe" style={{
            background: `
              radial-gradient(ellipse 30% 50% at 15% 75%, rgba(251,191,36,0.18) 0%, transparent 70%),
              radial-gradient(ellipse 30% 50% at 85% 75%, rgba(164,131,250,0.15) 0%, transparent 70%),
              radial-gradient(ellipse 30% 50% at 50% 85%, rgba(74,222,128,0.12) 0%, transparent 70%)
            `,
          }} />
        </div>
      );
    case 'ripe':
      return (
        <div className={base}>
          <div className="absolute inset-0 celeb-bg-ripe-flash" style={{
            background: `
              radial-gradient(ellipse 40% 50% at 20% 70%, rgba(251,191,36,0.25) 0%, transparent 70%),
              radial-gradient(ellipse 40% 50% at 80% 70%, rgba(244,114,182,0.2) 0%, transparent 70%),
              radial-gradient(ellipse 50% 40% at 50% 80%, rgba(251,191,36,0.3) 0%, transparent 60%)
            `,
          }} />
          <div className="absolute inset-0 celeb-bg-ripe-strobe" style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(251,191,36,0.08) 0%, transparent 70%)',
          }} />
        </div>
      );
    case 'legendary':
      return (
        <div className={base}>
          <div className="absolute inset-0 celeb-bg-ripe-flash" style={{
            background: `
              radial-gradient(ellipse 60% 60% at 50% 50%, rgba(251,191,36,0.4) 0%, transparent 60%),
              radial-gradient(ellipse 40% 50% at 20% 60%, rgba(251,191,36,0.3) 0%, transparent 70%),
              radial-gradient(ellipse 40% 50% at 80% 60%, rgba(251,191,36,0.3) 0%, transparent 70%),
              radial-gradient(ellipse 50% 40% at 50% 30%, rgba(239,68,68,0.15) 0%, transparent 60%)
            `,
          }} />
          <div className="absolute inset-0 celeb-bg-ripe-strobe" style={{
            background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(251,191,36,0.15) 0%, transparent 60%)',
          }} />
        </div>
      );
  }
}

// ─── Glow rings behind icon ───
function GlowRings({ config, stage }: { config: StageConfig; stage: GrowthStage }) {
  const baseColor = stage === 'sprout' ? '74,222,128' : '251,191,36'; // green for sprout, gold for others
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {Array.from({ length: config.glowLayers }, (_, i) => {
        const scale = 1.3 + i * 0.35;
        const opacity = config.glowIntensity * (1 - i * 0.15);
        return (
          <div key={i} className="absolute rounded-full celeb-glow-pulse" style={{
            width: config.iconSize * scale,
            height: config.iconSize * scale,
            background: `radial-gradient(circle, rgba(${baseColor},${opacity * 0.6}) 0%, rgba(${baseColor},0) 70%)`,
            animationDelay: `${i * 0.15}s`,
            animationDuration: `${2 + i * 0.3}s`,
          }} />
        );
      })}
      {/* Radial rays for bloom+ */}
      {(stage === 'bloom' || stage === 'green' || stage === 'ripe') && (
        <div className="absolute celeb-rays-rotate" style={{
          width: config.iconSize * 2.5,
          height: config.iconSize * 2.5,
          background: `conic-gradient(from 0deg, transparent 0deg, rgba(251,191,36,${config.glowIntensity * 0.15}) 10deg, transparent 20deg, transparent 40deg, rgba(251,191,36,${config.glowIntensity * 0.12}) 50deg, transparent 60deg, transparent 80deg, rgba(251,191,36,${config.glowIntensity * 0.15}) 90deg, transparent 100deg, transparent 120deg, rgba(251,191,36,${config.glowIntensity * 0.12}) 130deg, transparent 140deg, transparent 160deg, rgba(251,191,36,${config.glowIntensity * 0.15}) 170deg, transparent 180deg, transparent 200deg, rgba(251,191,36,${config.glowIntensity * 0.12}) 210deg, transparent 220deg, transparent 240deg, rgba(251,191,36,${config.glowIntensity * 0.15}) 250deg, transparent 260deg, transparent 280deg, rgba(251,191,36,${config.glowIntensity * 0.12}) 290deg, transparent 300deg, transparent 320deg, rgba(251,191,36,${config.glowIntensity * 0.15}) 330deg, transparent 340deg, transparent 360deg)`,
          borderRadius: '50%',
        }} />
      )}
    </div>
  );
}

// ─── Particle renderer ───
function ParticleLayer({ particles, stage }: { particles: Particle[]; stage: GrowthStage }) {
  const isSeed = stage === 'seed';
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => {
        const tx = Math.cos(p.angle) * p.speed;
        const ty = Math.sin(p.angle) * p.speed;
        const animClass = isSeed && p.kind === 'dot'
          ? 'celeb-particle-rise'
          : p.kind === 'firework' ? 'celeb-particle-burst'
          : 'celeb-particle-fall';

        let shape: React.CSSProperties = {};
        if (p.kind === 'leaf') {
          shape = { borderRadius: '0 50% 50% 50%', transform: `rotate(${p.rotation}deg)` };
        } else if (p.kind === 'petal') {
          shape = { borderRadius: '50% 0 50% 0', transform: `rotate(${p.rotation}deg)` };
        } else if (p.kind === 'confetti') {
          shape = { borderRadius: '1px', transform: `rotate(${p.rotation}deg)` };
        } else {
          shape = { borderRadius: '50%' };
        }

        return (
          <div
            key={p.id}
            className={`absolute ${animClass}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.kind === 'confetti' ? p.size * 0.5 : p.size,
              backgroundColor: p.color,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              '--rot': `${p.rotation + p.spin}deg`,
              animationDelay: `${p.delay}s`,
              ...shape,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

// ─── Main component ───
export function CelebrationOverlay({ stage, isRipe, onComplete }: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');
  const theme = useTheme();
  const t = useI18n();
  // Keep one random seed per overlay mount so a single celebration is stable, but the next trigger re-rolls.
  const [instanceNonce] = useState(() => Math.random().toString(36).slice(2));
  const config = STAGE_CONFIG[stage];

  // Pick deterministic text per overlay instance so it stays stable across re-renders.
  const text = useMemo(() => {
    const pools: Record<GrowthStage, readonly string[]> = {
      seed: t.celebrateSeed,
      sprout: t.celebrateSprout,
      bloom: t.celebrateBloom,
      green: t.celebrateGreen,
      ripe: t.celebrateRipe,
      legendary: t.celebrateLegendary,
    };
    return pickSeeded(pools[stage], `${instanceNonce}-${stage}-text`);
  }, [instanceNonce, stage, t]);

  const specialEffectSeed = `${instanceNonce}-${stage}-effect`;

  const specialEffect = useMemo(() => {
    if (!config.hasSpecialEffect) return null;
    return pickSeeded(SPECIAL_EFFECTS, specialEffectSeed);
  }, [config.hasSpecialEffect, specialEffectSeed]);

  const particles = useMemo(
    () => generateParticles(stage, config, `${instanceNonce}-particles`),
    [instanceNonce, stage, config],
  );

  // Click to dismiss
  const dismiss = useCallback(() => {
    setPhase('exit');
    setTimeout(() => { setVisible(false); onComplete(); }, 300);
  }, [onComplete]);

  useEffect(() => {
    const showDuration = config.duration - config.enterMs - config.exitMs;
    const t1 = setTimeout(() => setPhase('show'), 50);
    const t2 = setTimeout(() => setPhase('exit'), config.enterMs + showDuration);
    const t3 = setTimeout(() => { setVisible(false); onComplete(); }, config.duration);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [config, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center cursor-pointer transition-opacity ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${config.exitMs}ms` }}
      onClick={dismiss}
    >
      {/* Layer 1: Background lights */}
      <BackgroundLayer stage={stage} />

      {/* Layer 2: Glow rings + icon */}
      <div className="relative flex items-center justify-center" style={{
        width: config.iconSize * 3,
        height: config.iconSize * 3,
      }}>
        <GlowRings config={config} stage={stage} />
        <div className={isRipe ? 'celebration-emoji-ripe' : 'celebration-emoji'}>
          <GrowthIcon stage={stage} size={config.iconSize} />
        </div>
      </div>

      {/* Layer 3: Particles */}
      <ParticleLayer particles={particles} stage={stage} />

      {/* Layer 3b: Special effect (ripe only) */}
      {specialEffect && <SpecialEffectLayer effect={specialEffect} seed={specialEffectSeed} />}

      {/* Layer 4: Text */}
      <div
        className="celebration-text mt-5 px-6 text-center text-base sm:text-lg"
        style={{ color: theme.text }}
      >
        {text}
      </div>
    </div>
  );
}
