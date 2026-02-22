/**
 * FarmDecorations - Corner props and animals around the farm.
 *
 * Places houses/barns in all corners plus side animals with fully
 * SVG-drawn assets. Elements are responsive and stay outside gameplay.
 */

interface HouseIconProps {
  roof: 'red' | 'blue';
}

function HouseIcon({ roof }: HouseIconProps) {
  const roofMain = roof === 'red' ? '#DF655A' : '#73AEEA';
  const roofDark = roof === 'red' ? '#B1473D' : '#447AB8';

  return (
    <svg viewBox="0 0 150 132" className="h-[66px] w-[82px] sm:h-[82px] sm:w-[100px] md:h-[96px] md:w-[116px]">
      <ellipse cx="75" cy="120" rx="46" ry="8" fill="#00000020" />
      <rect x="34" y="48" width="82" height="58" rx="10" fill="#F7E7CC" stroke="#9D7651" strokeWidth="4" />
      <path d="M24 58 L75 20 L126 58 L118 68 L75 36 L32 68 Z" fill={roofMain} stroke={roofDark} strokeWidth="4" />
      <rect x="96" y="26" width="11" height="22" rx="3" fill="#A87C56" stroke="#7C5A3D" strokeWidth="2.5" />
      <rect x="67" y="68" width="16" height="38" rx="3.5" fill="#BF8D5D" stroke="#845E3E" strokeWidth="3" />
      <circle cx="79" cy="87" r="1.8" fill="#F7E7CC" />
      <rect x="44" y="65" width="16" height="15" rx="3" fill="#D4EEFF" stroke="#845E3E" strokeWidth="3" />
      <rect x="90" y="65" width="16" height="15" rx="3" fill="#D4EEFF" stroke="#845E3E" strokeWidth="3" />
      <line x1="52" y1="65" x2="52" y2="80" stroke="#845E3E" strokeWidth="2" />
      <line x1="44" y1="72.5" x2="60" y2="72.5" stroke="#845E3E" strokeWidth="2" />
      <line x1="98" y1="65" x2="98" y2="80" stroke="#845E3E" strokeWidth="2" />
      <line x1="90" y1="72.5" x2="106" y2="72.5" stroke="#845E3E" strokeWidth="2" />
    </svg>
  );
}

function BarnIcon() {
  return (
    <svg viewBox="0 0 150 132" className="h-[68px] w-[84px] sm:h-[84px] sm:w-[102px] md:h-[98px] md:w-[118px]">
      <ellipse cx="75" cy="120" rx="48" ry="8" fill="#00000020" />
      <path
        d="M30 56 Q75 16 120 56 L120 104 Q120 112 112 112 H38 Q30 112 30 104 Z"
        fill="#D65A4C"
        stroke="#8E3A32"
        strokeWidth="4"
      />
      <path d="M30 56 Q75 12 120 56" fill="none" stroke="#8E3A32" strokeWidth="4" />
      <rect x="58" y="64" width="34" height="48" rx="5" fill="#F2E3CC" stroke="#8E3A32" strokeWidth="3.5" />
      <line x1="58" y1="88" x2="92" y2="64" stroke="#8E3A32" strokeWidth="3" />
      <line x1="58" y1="64" x2="92" y2="88" stroke="#8E3A32" strokeWidth="3" />
      <rect x="62" y="44" width="26" height="18" rx="3.5" fill="#F2E3CC" stroke="#8E3A32" strokeWidth="3" />
      <line x1="75" y1="44" x2="75" y2="62" stroke="#8E3A32" strokeWidth="2.5" />
      <line x1="62" y1="53" x2="88" y2="53" stroke="#8E3A32" strokeWidth="2.5" />
    </svg>
  );
}

interface FenceSegmentProps {
  mirrored?: boolean;
}

function FenceSegment({ mirrored = false }: FenceSegmentProps) {
  return (
    <svg
      viewBox="0 0 76 42"
      className="h-[24px] w-[52px] sm:h-[30px] sm:w-[64px] md:h-[34px] md:w-[72px]"
      style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
    >
      <rect x="8" y="9" width="11" height="30" rx="3" fill="#C79A6A" stroke="#896040" strokeWidth="2.5" />
      <rect x="57" y="9" width="11" height="30" rx="3" fill="#C79A6A" stroke="#896040" strokeWidth="2.5" />
      <rect x="16" y="16" width="44" height="7" rx="3.5" fill="#D5AD7F" stroke="#896040" strokeWidth="2" />
      <rect x="16" y="26" width="44" height="7" rx="3.5" fill="#D5AD7F" stroke="#896040" strokeWidth="2" />
    </svg>
  );
}

function CowIcon() {
  return (
    <svg viewBox="0 0 134 98" className="h-[56px] w-[74px] sm:h-[74px] sm:w-[96px] md:h-[88px] md:w-[112px]">
      <ellipse cx="66" cy="90" rx="42" ry="6" fill="#00000020" />
      <ellipse cx="68" cy="54" rx="38" ry="24" fill="#FFFFFF" stroke="#2C2C2C" strokeWidth="3" />
      <ellipse cx="50" cy="48" rx="10" ry="8" fill="#1F1F1F" />
      <ellipse cx="76" cy="60" rx="8" ry="6" fill="#1F1F1F" />
      <ellipse cx="88" cy="44" rx="6" ry="5" fill="#1F1F1F" />
      <ellipse cx="28" cy="50" rx="14" ry="13" fill="#FFFFFF" stroke="#2C2C2C" strokeWidth="3" />
      <ellipse cx="18" cy="44" rx="5" ry="7" fill="#FFFFFF" stroke="#2C2C2C" strokeWidth="2.5" />
      <ellipse cx="26" cy="64" rx="10" ry="7" fill="#F6B9B7" stroke="#2C2C2C" strokeWidth="2.5" />
      <circle cx="22.5" cy="63.5" r="1.6" fill="#3A2A2A" />
      <circle cx="29.5" cy="63.5" r="1.6" fill="#3A2A2A" />
      <circle cx="24" cy="47" r="2.1" fill="#2C2C2C" />
      <rect x="48" y="72" width="8" height="18" rx="3" fill="#FFFFFF" stroke="#2C2C2C" strokeWidth="2.5" />
      <rect x="70" y="72" width="8" height="18" rx="3" fill="#FFFFFF" stroke="#2C2C2C" strokeWidth="2.5" />
      <path d="M104 48 C114 44 116 36 111 31" fill="none" stroke="#2C2C2C" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function SheepIcon() {
  return (
    <svg viewBox="0 0 132 98" className="h-[54px] w-[72px] sm:h-[72px] sm:w-[92px] md:h-[86px] md:w-[108px]">
      <ellipse cx="64" cy="90" rx="40" ry="6" fill="#00000020" />
      <circle cx="48" cy="52" r="18" fill="#FFFFFF" stroke="#CFCFCF" strokeWidth="3" />
      <circle cx="65" cy="46" r="18" fill="#FFFFFF" stroke="#CFCFCF" strokeWidth="3" />
      <circle cx="81" cy="54" r="16" fill="#FFFFFF" stroke="#CFCFCF" strokeWidth="3" />
      <ellipse cx="31" cy="54" rx="14" ry="13" fill="#EFEFEF" stroke="#8D8D8D" strokeWidth="2.8" />
      <ellipse cx="24" cy="50" rx="4.5" ry="6" fill="#EFEFEF" stroke="#8D8D8D" strokeWidth="2.2" />
      <ellipse cx="30" cy="66" rx="9" ry="6.5" fill="#FADEE2" stroke="#8D8D8D" strokeWidth="2.3" />
      <circle cx="27.5" cy="66" r="1.5" fill="#6B5961" />
      <circle cx="32.8" cy="66" r="1.5" fill="#6B5961" />
      <circle cx="28.5" cy="52" r="2" fill="#4A4A4A" />
      <rect x="52" y="71" width="7" height="17" rx="3" fill="#F7F7F7" stroke="#B7B7B7" strokeWidth="2.2" />
      <rect x="73" y="71" width="7" height="17" rx="3" fill="#F7F7F7" stroke="#B7B7B7" strokeWidth="2.2" />
    </svg>
  );
}

export function FarmDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[14]" aria-hidden="true">
      <div className="absolute left-[0.8%] top-[0.8%] opacity-95">
        <FenceSegment />
      </div>
      <div className="absolute right-[0.8%] top-[0.8%] opacity-95">
        <FenceSegment mirrored />
      </div>
      <div className="absolute left-[0.8%] bottom-[0.8%] opacity-95">
        <FenceSegment />
      </div>
      <div className="absolute right-[0.8%] bottom-[0.8%] opacity-95">
        <FenceSegment mirrored />
      </div>

      <div className="absolute left-[2.2%] top-[3%]">
        <HouseIcon roof="red" />
      </div>
      <div className="absolute right-[2.2%] top-[3%]">
        <BarnIcon />
      </div>
      <div className="absolute left-[2.2%] bottom-[3%]">
        <BarnIcon />
      </div>
      <div className="absolute right-[2.2%] bottom-[3%]">
        <HouseIcon roof="blue" />
      </div>

      <div className="absolute left-[1.1%] top-[49%] -translate-y-1/2">
        <CowIcon />
      </div>
      <div className="absolute right-[1.1%] top-[53%] -translate-y-1/2">
        <SheepIcon />
      </div>
    </div>
  );
}
