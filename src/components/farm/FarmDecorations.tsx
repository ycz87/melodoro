/**
 * FarmDecorations - Soft corner props for the portrait farm scene.
 *
 * Uses one consistent cartoon language across buildings, animals and fences:
 * warm rounded strokes, gentle shadows, and toned-down opacity so center plots
 * remain the visual focus.
 */

const STROKE = '#6f5a43';
const SHADOW = '#3f6b3b22';

interface HouseIconProps {
  roof: 'red' | 'blue';
  className?: string;
}

function HouseIcon({ roof, className = 'h-[52px] w-[70px] sm:h-[62px] sm:w-[82px] md:h-[74px] md:w-[96px]' }: HouseIconProps) {
  const roofMain = roof === 'red' ? '#db8666' : '#7dadde';
  const roofShade = roof === 'red' ? '#c46f52' : '#6695c6';
  const wallMain = '#f5dfbf';
  const wallShade = '#edcfab';

  return (
    <svg viewBox="0 0 150 126" className={className}>
      <ellipse cx="75" cy="114" rx="46" ry="8" fill={SHADOW} />
      <rect x="36" y="50" width="78" height="54" rx="12" fill={wallMain} stroke={STROKE} strokeWidth="2.4" />
      <path d="M36 78 C52 85 100 85 114 78 L114 95 C98 102 88 104 75 104 C62 104 52 102 36 95 Z" fill={wallShade} />
      <path d="M24 58 L75 20 L126 58 L120 67 L75 36 L30 67 Z" fill={roofMain} stroke={STROKE} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M75 28 L117 58 L109 58 L75 34 L41 58 L33 58 Z" fill={roofShade} opacity="0.52" />
      <rect x="67" y="69" width="16" height="35" rx="4.5" fill="#bd8e61" stroke={STROKE} strokeWidth="2.1" />
      <circle cx="79" cy="87" r="1.5" fill={wallMain} />
      <rect x="46" y="65" width="15" height="14" rx="3.5" fill="#d8edfb" stroke={STROKE} strokeWidth="2" />
      <rect x="89" y="65" width="15" height="14" rx="3.5" fill="#d8edfb" stroke={STROKE} strokeWidth="2" />
      <line x1="53.5" y1="65" x2="53.5" y2="79" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="46" y1="72" x2="61" y2="72" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="96.5" y1="65" x2="96.5" y2="79" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="89" y1="72" x2="104" y2="72" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BarnIcon({ className = 'h-[54px] w-[72px] sm:h-[64px] sm:w-[84px] md:h-[78px] md:w-[98px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 156 126" className={className}>
      <ellipse cx="78" cy="114" rx="46" ry="8" fill={SHADOW} />
      <path d="M28 56 L78 24 L128 56 L116 56 L78 34 L40 56 Z" fill="#b8574f" stroke={STROKE} strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="30" y="56" width="96" height="50" rx="10" fill="#d77466" stroke={STROKE} strokeWidth="2.4" />
      <rect x="68" y="69" width="20" height="37" rx="4.5" fill="#a95647" stroke={STROKE} strokeWidth="2.1" />
      <line x1="78" y1="69" x2="78" y2="106" stroke="#d48f80" strokeWidth="2" strokeLinecap="round" />
      <rect x="45" y="70" width="15" height="14" rx="3.5" fill="#f8ebc8" stroke={STROKE} strokeWidth="2" />
      <rect x="96" y="70" width="15" height="14" rx="3.5" fill="#f8ebc8" stroke={STROKE} strokeWidth="2" />
      <line x1="52.5" y1="70" x2="52.5" y2="84" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="45" y1="77" x2="60" y2="77" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="103.5" y1="70" x2="103.5" y2="84" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="96" y1="77" x2="111" y2="77" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface FenceSegmentProps {
  mirrored?: boolean;
}

function FenceSegment({ mirrored = false }: FenceSegmentProps) {
  return (
    <svg
      viewBox="0 0 122 58"
      className="h-[20px] w-[50px] sm:h-[24px] sm:w-[58px] md:h-[28px] md:w-[66px]"
      style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
    >
      <ellipse cx="61" cy="52" rx="44" ry="5.5" fill={SHADOW} />
      <rect x="18" y="24" width="86" height="8" rx="4" fill="#d8b88f" stroke={STROKE} strokeWidth="2" />
      <rect x="16" y="34" width="90" height="8" rx="4" fill="#d8b88f" stroke={STROKE} strokeWidth="2" />
      <rect x="21" y="12" width="9" height="32" rx="3.5" fill="#cea97f" stroke={STROKE} strokeWidth="2" />
      <rect x="57" y="10" width="9" height="34" rx="3.5" fill="#cea97f" stroke={STROKE} strokeWidth="2" />
      <rect x="92" y="12" width="9" height="32" rx="3.5" fill="#cea97f" stroke={STROKE} strokeWidth="2" />
    </svg>
  );
}

function GrassTuft({ className = 'h-[12px] w-[26px] sm:h-[14px] sm:w-[30px] md:h-[16px] md:w-[34px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 88 44" className={className}>
      <ellipse cx="44" cy="40" rx="28" ry="5" fill={SHADOW} />
      <path d="M14 35 C20 30 22 22 22 12 C27 22 30 30 34 35 Z" fill="#72a955" />
      <path d="M31 36 C38 30 41 20 40 7 C47 20 51 31 55 36 Z" fill="#85bc62" />
      <path d="M51 36 C58 31 62 21 62 10 C67 21 70 31 76 36 Z" fill="#6ea652" />
    </svg>
  );
}

function CowIcon({ className = 'h-[48px] w-[66px] sm:h-[58px] sm:w-[78px] md:h-[68px] md:w-[92px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 98" className={className}>
      <ellipse cx="66" cy="90" rx="40" ry="6" fill={SHADOW} />
      <ellipse cx="68" cy="54" rx="36" ry="22" fill="#ffffff" stroke={STROKE} strokeWidth="2.4" />
      <ellipse cx="50" cy="49" rx="9" ry="7" fill="#4c433c" />
      <ellipse cx="78" cy="60" rx="8" ry="6" fill="#4c433c" />
      <ellipse cx="89" cy="44" rx="6" ry="5" fill="#4c433c" />
      <ellipse cx="30" cy="52" rx="13" ry="12" fill="#ffffff" stroke={STROKE} strokeWidth="2.4" />
      <ellipse cx="20" cy="46" rx="5" ry="6.5" fill="#ffffff" stroke={STROKE} strokeWidth="2" />
      <ellipse cx="28" cy="64" rx="9.5" ry="7" fill="#f5c2bc" stroke={STROKE} strokeWidth="2" />
      <circle cx="24.5" cy="64" r="1.5" fill="#5b463c" />
      <circle cx="30.8" cy="64" r="1.5" fill="#5b463c" />
      <circle cx="24.5" cy="49" r="1.9" fill={STROKE} />
      <rect x="49" y="72" width="8" height="17" rx="3" fill="#ffffff" stroke={STROKE} strokeWidth="2" />
      <rect x="71" y="72" width="8" height="17" rx="3" fill="#ffffff" stroke={STROKE} strokeWidth="2" />
      <path d="M103 48 C113 45 114 37 109 32" fill="none" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SheepIcon({ className = 'h-[48px] w-[66px] sm:h-[58px] sm:w-[78px] md:h-[68px] md:w-[92px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 98" className={className}>
      <ellipse cx="64" cy="90" rx="40" ry="6" fill={SHADOW} />
      <circle cx="48" cy="52" r="17" fill="#ffffff" stroke="#bcae9e" strokeWidth="2.3" />
      <circle cx="65" cy="46" r="17" fill="#ffffff" stroke="#bcae9e" strokeWidth="2.3" />
      <circle cx="81" cy="54" r="15" fill="#ffffff" stroke="#bcae9e" strokeWidth="2.3" />
      <ellipse cx="31" cy="55" rx="13" ry="12" fill="#efe7db" stroke={STROKE} strokeWidth="2.1" />
      <ellipse cx="24" cy="50" rx="4.4" ry="5.8" fill="#efe7db" stroke={STROKE} strokeWidth="1.9" />
      <ellipse cx="30" cy="66" rx="8.4" ry="6.2" fill="#f9dbe0" stroke={STROKE} strokeWidth="1.9" />
      <circle cx="27.6" cy="66" r="1.4" fill="#655750" />
      <circle cx="32.4" cy="66" r="1.4" fill="#655750" />
      <circle cx="28.4" cy="52" r="1.8" fill={STROKE} />
      <rect x="52" y="71" width="7" height="17" rx="3" fill="#f6f4f1" stroke={STROKE} strokeWidth="1.9" />
      <rect x="73" y="71" width="7" height="17" rx="3" fill="#f6f4f1" stroke={STROKE} strokeWidth="1.9" />
    </svg>
  );
}

function BushIcon({ className = 'h-[20px] w-[28px] sm:h-[24px] sm:w-[34px] md:h-[28px] md:w-[40px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 116 70" className={className}>
      <ellipse cx="58" cy="58" rx="40" ry="8.5" fill={SHADOW} />
      <ellipse cx="34" cy="38" rx="20" ry="16" fill="#88bf65" />
      <ellipse cx="58" cy="31" rx="25" ry="20" fill="#97cd77" />
      <ellipse cx="83" cy="39" rx="19" ry="16" fill="#7fb65d" />
    </svg>
  );
}

function FlowerPatch({ className = 'h-[12px] w-[28px] sm:h-[14px] sm:w-[32px] md:h-[16px] md:w-[36px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 36" className={className}>
      <path d="M12 30 L12 25 M24 30 L24 19 M38 30 L38 23 M54 30 L54 18 M68 30 L68 22" stroke="#6ba44f" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="24" r="3.2" fill="#f6df89" />
      <circle cx="24" cy="18" r="3.1" fill="#f8b8b4" />
      <circle cx="38" cy="22" r="3.2" fill="#9de8b1" />
      <circle cx="54" cy="17" r="3.1" fill="#f6b6cf" />
      <circle cx="68" cy="21" r="3.1" fill="#bfdcf8" />
    </svg>
  );
}

export function FarmDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[8] overflow-hidden" aria-hidden="true">
      <div className="absolute left-[7.8%] top-[48.2%] z-[9] opacity-72">
        <FenceSegment />
      </div>
      <div className="absolute right-[7.8%] top-[48.4%] z-[9] opacity-72">
        <FenceSegment mirrored />
      </div>
      <div className="absolute left-[11.4%] bottom-[9.6%] z-[12] opacity-68">
        <FenceSegment />
      </div>
      <div className="absolute right-[11.4%] bottom-[9.4%] z-[12] opacity-68">
        <FenceSegment mirrored />
      </div>

      <div className="absolute left-[1.4%] top-[33.8%] z-[10] opacity-88 drop-shadow-[0_3px_6px_rgba(74,114,56,0.18)]">
        <HouseIcon roof="red" />
      </div>
      <div className="absolute right-[1.4%] top-[33.4%] z-[10] opacity-88 drop-shadow-[0_3px_6px_rgba(74,114,56,0.18)]">
        <BarnIcon />
      </div>
      <div className="absolute left-[2.6%] bottom-[3.2%] z-[11] opacity-74 drop-shadow-[0_3px_5px_rgba(74,114,56,0.16)]">
        <BarnIcon className="h-[42px] w-[56px] sm:h-[50px] sm:w-[66px] md:h-[60px] md:w-[78px]" />
      </div>
      <div className="absolute right-[2.6%] bottom-[3.3%] z-[11] opacity-74 drop-shadow-[0_3px_5px_rgba(74,114,56,0.16)]">
        <HouseIcon
          roof="blue"
          className="h-[40px] w-[54px] sm:h-[48px] sm:w-[64px] md:h-[58px] md:w-[76px]"
        />
      </div>

      <div className="absolute left-[0.6%] top-[68.2%] z-[13] -translate-y-1/2 opacity-88">
        <CowIcon />
      </div>
      <div className="absolute right-[0.6%] top-[68.6%] z-[13] -translate-y-1/2 opacity-88">
        <SheepIcon />
      </div>

      <div className="absolute left-[3.8%] top-[45.2%] z-[9] opacity-78">
        <BushIcon className="h-[24px] w-[34px] sm:h-[28px] sm:w-[40px] md:h-[32px] md:w-[46px]" />
      </div>
      <div className="absolute right-[3.8%] top-[44.8%] z-[9] opacity-78">
        <BushIcon className="h-[24px] w-[34px] sm:h-[28px] sm:w-[40px] md:h-[32px] md:w-[46px]" />
      </div>
      <div className="absolute left-[6.8%] bottom-[13.2%] z-[12] opacity-74">
        <BushIcon className="h-[22px] w-[32px] sm:h-[26px] sm:w-[38px] md:h-[30px] md:w-[44px]" />
      </div>
      <div className="absolute right-[6.8%] bottom-[13%] z-[12] opacity-74">
        <BushIcon className="h-[22px] w-[32px] sm:h-[26px] sm:w-[38px] md:h-[30px] md:w-[44px]" />
      </div>

      <div className="absolute left-[8.2%] top-[57.2%] z-[12] opacity-74">
        <FlowerPatch className="h-[14px] w-[32px] sm:h-[16px] sm:w-[36px] md:h-[18px] md:w-[42px]" />
      </div>
      <div className="absolute right-[8.2%] top-[57.5%] z-[12] opacity-74">
        <FlowerPatch className="h-[14px] w-[32px] sm:h-[16px] sm:w-[36px] md:h-[18px] md:w-[42px]" />
      </div>

      <div className="absolute left-[5.1%] top-[40.8%] z-[9] opacity-78">
        <GrassTuft className="h-[14px] w-[30px] sm:h-[16px] sm:w-[36px] md:h-[18px] md:w-[40px]" />
      </div>
      <div className="absolute right-[5.1%] top-[40.4%] z-[9] opacity-78">
        <GrassTuft className="h-[14px] w-[30px] sm:h-[16px] sm:w-[36px] md:h-[18px] md:w-[40px]" />
      </div>
      <div className="absolute left-[5.1%] bottom-[6.7%] z-[12] opacity-74">
        <GrassTuft className="h-[14px] w-[30px] sm:h-[16px] sm:w-[36px] md:h-[18px] md:w-[40px]" />
      </div>
      <div className="absolute right-[5.1%] bottom-[6.5%] z-[12] opacity-74">
        <GrassTuft className="h-[14px] w-[30px] sm:h-[16px] sm:w-[36px] md:h-[18px] md:w-[40px]" />
      </div>
    </div>
  );
}
