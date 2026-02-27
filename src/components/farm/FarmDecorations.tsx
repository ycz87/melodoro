/**
 * FarmDecorations - Soft corner props for the portrait farm scene.
 *
 * Uses one consistent cartoon language across buildings, animals and fences:
 * warm rounded strokes, gentle shadows, and toned-down opacity so center plots
 * remain the visual focus.
 */

const STROKE = '#6f5a43';
const SHADOW = '#3f6b3b20';
const STROKE_MAIN_WIDTH = 2.2;
const STROKE_DETAIL_WIDTH = 1.4;

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
    <svg viewBox="0 0 150 126" className={className} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="75" cy="114" rx="46" ry="8" fill={SHADOW} />
      <rect x="36" y="50" width="78" height="54" rx="12" fill={wallMain} stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <path d="M36 78 C52 85 100 85 114 78 L114 95 C98 102 88 104 75 104 C62 104 52 102 36 95 Z" fill={wallShade} />
      <path d="M24 58 L75 20 L126 58 L120 67 L75 36 L30 67 Z" fill={roofMain} stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} strokeLinejoin="round" />
      <path d="M75 28 L117 58 L109 58 L75 34 L41 58 L33 58 Z" fill={roofShade} opacity="0.52" />
      <rect x="67" y="69" width="16" height="35" rx="4.5" fill="#bd8e61" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <circle cx="79" cy="87" r="1.5" fill={wallMain} />
      <rect x="46" y="65" width="15" height="14" rx="3.5" fill="#d8edfb" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <rect x="89" y="65" width="15" height="14" rx="3.5" fill="#d8edfb" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <line x1="53.5" y1="65" x2="53.5" y2="79" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} strokeLinecap="round" />
      <line x1="46" y1="72" x2="61" y2="72" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} strokeLinecap="round" />
      <line x1="96.5" y1="65" x2="96.5" y2="79" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} strokeLinecap="round" />
      <line x1="89" y1="72" x2="104" y2="72" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} strokeLinecap="round" />
    </svg>
  );
}

function BarnIcon({ className = 'h-[54px] w-[72px] sm:h-[64px] sm:w-[84px] md:h-[78px] md:w-[98px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 156 126" className={className} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="78" cy="114" rx="46" ry="8" fill={SHADOW} />
      <path d="M28 56 L78 24 L128 56 L116 56 L78 34 L40 56 Z" fill="#b8574f" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} strokeLinejoin="round" />
      <rect x="30" y="56" width="96" height="50" rx="10" fill="#d77466" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <rect x="68" y="69" width="20" height="37" rx="4.5" fill="#a95647" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <line x1="78" y1="69" x2="78" y2="106" stroke="#d48f80" strokeWidth={STROKE_MAIN_WIDTH} strokeLinecap="round" />
      <rect x="45" y="70" width="15" height="14" rx="3.5" fill="#f8ebc8" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <rect x="96" y="70" width="15" height="14" rx="3.5" fill="#f8ebc8" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <line x1="52.5" y1="70" x2="52.5" y2="84" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} strokeLinecap="round" />
      <line x1="45" y1="77" x2="60" y2="77" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} strokeLinecap="round" />
      <line x1="103.5" y1="70" x2="103.5" y2="84" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} strokeLinecap="round" />
      <line x1="96" y1="77" x2="111" y2="77" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} strokeLinecap="round" />
    </svg>
  );
}

function TopLeftHouseIcon({ className = 'h-[118px] w-[156px] sm:h-[134px] sm:w-[176px] md:h-[156px] md:w-[206px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 176 152" className={className} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="86" cy="136" rx="56" ry="10" fill={SHADOW} />
      <rect x="36" y="66" width="102" height="62" rx="14" fill="#f3b067" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <rect x="56" y="46" width="66" height="34" rx="10" fill="#f7c384" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <path d="M26 72 L88 30 L150 72 L142 82 L88 46 L34 82 Z" fill="#f0894f" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <rect x="118" y="34" width="14" height="22" rx="3" fill="#9d6b4a" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} />
      <path d="M125 26 C122 21 123 16 128 12" fill="none" stroke="#e7d9c8" strokeWidth={STROKE_DETAIL_WIDTH} />
      <rect x="74" y="84" width="24" height="44" rx="6" fill="#bd8254" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <rect x="48" y="84" width="18" height="18" rx="4" fill="#d8edfb" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} />
      <rect x="110" y="84" width="18" height="18" rx="4" fill="#d8edfb" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} />
      <circle cx="94" cy="106" r="2" fill="#f9edd8" />
    </svg>
  );
}

function TopRightBarnIcon({ className = 'h-[122px] w-[160px] sm:h-[138px] sm:w-[182px] md:h-[162px] md:w-[214px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 186 160" className={className} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="92" cy="142" rx="58" ry="10" fill={SHADOW} />
      <path d="M30 88 C30 55 58 36 93 36 C128 36 156 55 156 88 L156 126 L30 126 Z" fill="#d75a4f" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <path d="M40 88 C40 61 62 48 93 48 C124 48 146 61 146 88" fill="#c8483d" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <rect x="80" y="82" width="26" height="44" rx="6" fill="#a5473f" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <line x1="93" y1="82" x2="93" y2="126" stroke="#d78f88" strokeWidth={STROKE_DETAIL_WIDTH} />
      <rect x="50" y="84" width="16" height="16" rx="4" fill="#f8ebc8" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} />
      <rect x="122" y="84" width="16" height="16" rx="4" fill="#f8ebc8" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} />
    </svg>
  );
}

function CrateIcon({ className = 'h-[30px] w-[36px] sm:h-[36px] sm:w-[44px] md:h-[44px] md:w-[52px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 82" className={className} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="45" cy="74" rx="24" ry="5" fill={SHADOW} />
      <rect x="20" y="26" width="50" height="42" rx="6" fill="#c48b51" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} />
      <line x1="20" y1="40" x2="70" y2="40" stroke="#a87443" strokeWidth={STROKE_DETAIL_WIDTH} />
      <line x1="35" y1="26" x2="35" y2="68" stroke="#a87443" strokeWidth={STROKE_DETAIL_WIDTH} />
      <line x1="55" y1="26" x2="55" y2="68" stroke="#a87443" strokeWidth={STROKE_DETAIL_WIDTH} />
    </svg>
  );
}

function ChickIcon({ className = 'h-[28px] w-[32px] sm:h-[34px] sm:w-[38px] md:h-[40px] md:w-[46px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 82 76" className={className} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="41" cy="68" rx="20" ry="5" fill={SHADOW} />
      <circle cx="40" cy="42" r="18" fill="#ffd86a" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} />
      <circle cx="35" cy="38" r="2" fill="#5b463c" />
      <circle cx="46" cy="38" r="2" fill="#5b463c" />
      <path d="M37 47 Q40 50 43 47" stroke="#5b463c" strokeWidth={STROKE_DETAIL_WIDTH} fill="none" />
      <path d="M58 44 L68 40 L58 36 Z" fill="#f59e0b" stroke={STROKE} strokeWidth="1" />
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
      <rect x="18" y="24" width="86" height="8" rx="4" fill="#d8b88f" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <rect x="16" y="34" width="90" height="8" rx="4" fill="#d8b88f" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <rect x="21" y="12" width="9" height="32" rx="3.5" fill="#cea97f" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <rect x="57" y="10" width="9" height="34" rx="3.5" fill="#cea97f" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <rect x="92" y="12" width="9" height="32" rx="3.5" fill="#cea97f" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
    </svg>
  );
}

function GrassTuft({ className = 'h-[12px] w-[26px] sm:h-[14px] sm:w-[30px] md:h-[16px] md:w-[34px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 88 44" className={className} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="44" cy="40" rx="28" ry="5" fill={SHADOW} />
      <path d="M14 35 C20 30 22 22 22 12 C27 22 30 30 34 35 Z" fill="#72a955" />
      <path d="M31 36 C38 30 41 20 40 7 C47 20 51 31 55 36 Z" fill="#85bc62" />
      <path d="M51 36 C58 31 62 21 62 10 C67 21 70 31 76 36 Z" fill="#6ea652" />
    </svg>
  );
}

function CowIcon({ className = 'h-[66px] w-[90px] sm:h-[80px] sm:w-[110px] md:h-[94px] md:w-[128px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 98" className={className} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="66" cy="90" rx="40" ry="6" fill={SHADOW} />
      <ellipse cx="68" cy="54" rx="36" ry="22" fill="#ffffff" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <ellipse cx="50" cy="49" rx="9" ry="7" fill="#4c433c" />
      <ellipse cx="78" cy="60" rx="8" ry="6" fill="#4c433c" />
      <ellipse cx="89" cy="44" rx="6" ry="5" fill="#4c433c" />
      <ellipse cx="30" cy="52" rx="13" ry="12" fill="#ffffff" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <ellipse cx="20" cy="46" rx="5" ry="6.5" fill="#ffffff" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <ellipse cx="28" cy="64" rx="9.5" ry="7" fill="#f5c2bc" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <circle cx="24.5" cy="64" r="1.5" fill="#5b463c" />
      <circle cx="30.8" cy="64" r="1.5" fill="#5b463c" />
      <circle cx="24.5" cy="49" r="1.9" fill={STROKE} />
      <rect x="49" y="72" width="8" height="17" rx="3" fill="#ffffff" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <rect x="71" y="72" width="8" height="17" rx="3" fill="#ffffff" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <path d="M103 48 C113 45 114 37 109 32" fill="none" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} strokeLinecap="round" />
    </svg>
  );
}

function SheepIcon({ className = 'h-[66px] w-[90px] sm:h-[80px] sm:w-[110px] md:h-[94px] md:w-[128px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 98" className={className} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="64" cy="90" rx="40" ry="6" fill={SHADOW} />
      <circle cx="48" cy="52" r="17" fill="#ffffff" stroke="#bcae9e" strokeWidth={STROKE_MAIN_WIDTH} />
      <circle cx="65" cy="46" r="17" fill="#ffffff" stroke="#bcae9e" strokeWidth={STROKE_MAIN_WIDTH} />
      <circle cx="81" cy="54" r="15" fill="#ffffff" stroke="#bcae9e" strokeWidth={STROKE_MAIN_WIDTH} />
      <ellipse cx="31" cy="55" rx="13" ry="12" fill="#efe7db" stroke={STROKE} strokeWidth={STROKE_MAIN_WIDTH} />
      <ellipse cx="24" cy="50" rx="4.4" ry="5.8" fill="#efe7db" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} />
      <ellipse cx="30" cy="66" rx="8.4" ry="6.2" fill="#f9dbe0" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} />
      <circle cx="27.6" cy="66" r="1.4" fill="#655750" />
      <circle cx="32.4" cy="66" r="1.4" fill="#655750" />
      <circle cx="28.4" cy="52" r="1.8" fill={STROKE} />
      <rect x="52" y="71" width="7" height="17" rx="3" fill="#f6f4f1" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} />
      <rect x="73" y="71" width="7" height="17" rx="3" fill="#f6f4f1" stroke={STROKE} strokeWidth={STROKE_DETAIL_WIDTH} />
    </svg>
  );
}

function BushIcon({ className = 'h-[20px] w-[28px] sm:h-[24px] sm:w-[34px] md:h-[28px] md:w-[40px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 116 70" className={className} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="58" cy="58" rx="40" ry="8.5" fill={SHADOW} />
      <ellipse cx="34" cy="38" rx="20" ry="16" fill="#88bf65" />
      <ellipse cx="58" cy="31" rx="25" ry="20" fill="#97cd77" />
      <ellipse cx="83" cy="39" rx="19" ry="16" fill="#7fb65d" />
    </svg>
  );
}

function FlowerPatch({ className = 'h-[12px] w-[28px] sm:h-[14px] sm:w-[32px] md:h-[16px] md:w-[36px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 36" className={className} strokeLinejoin="round" strokeLinecap="round">
      <path d="M12 30 L12 25 M24 30 L24 19 M38 30 L38 23 M54 30 L54 18 M68 30 L68 22" stroke="#6ba44f" strokeWidth={STROKE_DETAIL_WIDTH} strokeLinecap="round" />
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
      {/* ── Fences (mid-field) ── */}
      <div className="absolute left-[4.6%] top-[46%] z-[9] opacity-78">
        <FenceSegment />
      </div>
      <div className="absolute right-[4.6%] top-[45.8%] z-[9] opacity-78">
        <FenceSegment mirrored />
      </div>
      <div className="absolute left-[8%] bottom-[9%] z-[12] opacity-76">
        <FenceSegment />
      </div>
      <div className="absolute right-[8%] bottom-[8.8%] z-[12] opacity-76">
        <FenceSegment mirrored />
      </div>

      {/* ── Top-left house (desktop large, mobile slightly compact to avoid overlap) ── */}
      <div className="absolute left-[-8%] top-[11%] sm:top-[13%] md:top-[15%] z-[10] opacity-100 drop-shadow-[0_8px_14px_rgba(74,114,56,0.3)]">
        <TopLeftHouseIcon className="h-[132px] w-[174px] sm:h-[168px] sm:w-[222px] md:h-[210px] md:w-[278px]" />
      </div>
      {/* ── Top-right barn (desktop large, mobile slightly compact to avoid overlap) ── */}
      <div className="absolute right-[-8%] top-[10.5%] sm:top-[12.5%] md:top-[14.5%] z-[10] opacity-100 drop-shadow-[0_8px_14px_rgba(74,114,56,0.3)]">
        <TopRightBarnIcon className="h-[136px] w-[178px] sm:h-[172px] sm:w-[228px] md:h-[220px] md:w-[290px]" />
      </div>

      {/* ── Crate + chick (right mid, slightly larger) ── */}
      <div className="absolute right-[9%] top-[36%] z-[12] opacity-100">
        <CrateIcon className="h-[38px] w-[46px] sm:h-[46px] sm:w-[56px] md:h-[54px] md:w-[66px]" />
      </div>
      <div className="absolute right-[4.8%] top-[38%] z-[13] opacity-100">
        <ChickIcon className="h-[34px] w-[40px] sm:h-[42px] sm:w-[48px] md:h-[50px] md:w-[58px]" />
      </div>

      {/* ── Bottom corners: strong visible cut-edge framing (desktop priority) ── */}
      <div className="absolute left-[-9%] sm:left-[-11%] md:left-[-13%] bottom-[3%] sm:bottom-[2%] md:bottom-[1%] z-[15] opacity-92 drop-shadow-[0_7px_13px_rgba(74,114,56,0.3)]">
        <BarnIcon className="h-[132px] w-[174px] sm:h-[164px] sm:w-[216px] md:h-[246px] md:w-[324px]" />
      </div>
      <div className="absolute right-[-9%] sm:right-[-11%] md:right-[-13%] bottom-[3.2%] sm:bottom-[2.2%] md:bottom-[1.2%] z-[15] opacity-92 drop-shadow-[0_7px_13px_rgba(74,114,56,0.3)]">
        <HouseIcon
          roof="blue"
          className="h-[126px] w-[166px] sm:h-[158px] sm:w-[206px] md:h-[236px] md:w-[310px]"
        />
      </div>

      {/* ── Animals (scaled up ~20%) ── */}
      <div className="absolute left-[-3.5%] top-[70%] z-[13] -translate-y-1/2 opacity-94">
        <CowIcon className="h-[80px] w-[108px] sm:h-[96px] sm:w-[132px] md:h-[112px] md:w-[154px]" />
      </div>
      <div className="absolute right-[-3.5%] top-[70.4%] z-[13] -translate-y-1/2 opacity-94">
        <SheepIcon className="h-[80px] w-[108px] sm:h-[96px] sm:w-[132px] md:h-[112px] md:w-[154px]" />
      </div>

      {/* ── Bushes ── */}
      <div className="absolute left-[1.8%] top-[43%] z-[9] opacity-82">
        <BushIcon className="h-[28px] w-[40px] sm:h-[34px] sm:w-[48px] md:h-[40px] md:w-[56px]" />
      </div>
      <div className="absolute right-[1.8%] top-[42.8%] z-[9] opacity-82">
        <BushIcon className="h-[28px] w-[40px] sm:h-[34px] sm:w-[48px] md:h-[40px] md:w-[56px]" />
      </div>
      <div className="absolute left-[4.6%] bottom-[11%] z-[12] opacity-80">
        <BushIcon className="h-[28px] w-[40px] sm:h-[34px] sm:w-[48px] md:h-[40px] md:w-[56px]" />
      </div>
      <div className="absolute right-[4.6%] bottom-[10.8%] z-[12] opacity-80">
        <BushIcon className="h-[28px] w-[40px] sm:h-[34px] sm:w-[48px] md:h-[40px] md:w-[56px]" />
      </div>

      {/* ── Flower patches ── */}
      <div className="absolute left-[6%] top-[55%] z-[12] opacity-78">
        <FlowerPatch className="h-[16px] w-[36px] sm:h-[18px] sm:w-[42px] md:h-[20px] md:w-[48px]" />
      </div>
      <div className="absolute right-[6%] top-[55.2%] z-[12] opacity-78">
        <FlowerPatch className="h-[16px] w-[36px] sm:h-[18px] sm:w-[42px] md:h-[20px] md:w-[48px]" />
      </div>

      {/* ── Grass tufts ── */}
      <div className="absolute left-[3%] top-[39%] z-[9] opacity-80">
        <GrassTuft className="h-[16px] w-[34px] sm:h-[18px] sm:w-[40px] md:h-[20px] md:w-[46px]" />
      </div>
      <div className="absolute right-[3%] top-[38.8%] z-[9] opacity-80">
        <GrassTuft className="h-[16px] w-[34px] sm:h-[18px] sm:w-[40px] md:h-[20px] md:w-[46px]" />
      </div>
      <div className="absolute left-[3%] bottom-[5%] z-[12] opacity-78">
        <GrassTuft className="h-[16px] w-[34px] sm:h-[18px] sm:w-[40px] md:h-[20px] md:w-[46px]" />
      </div>
      <div className="absolute right-[3%] bottom-[4.8%] z-[12] opacity-78">
        <GrassTuft className="h-[16px] w-[34px] sm:h-[18px] sm:w-[40px] md:h-[20px] md:w-[46px]" />
      </div>
    </div>
  );
}
