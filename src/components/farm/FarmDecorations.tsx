/**
 * FarmDecorations - Corner props and animals around the farm.
 *
 * Keeps lightweight corner decorations while preserving a clear center
 * for the 7 playable farm plots.
 */

interface HouseIconProps {
  roof: 'red' | 'blue';
  className?: string;
}

function HouseIcon({ roof, className = 'h-[50px] w-[64px] sm:h-[62px] sm:w-[80px] md:h-[72px] md:w-[92px]' }: HouseIconProps) {
  const roofMain = roof === 'red' ? '#E87C5E' : '#73AEEA';
  const roofDark = roof === 'red' ? '#B95B42' : '#447AB8';
  const wallMain = roof === 'red' ? '#F8DFC0' : '#F7E7CC';
  const wallShade = roof === 'red' ? '#F2CFAB' : '#EFD6B3';

  return (
    <svg viewBox="0 0 150 132" className={className}>
      <ellipse cx="75" cy="120" rx="46" ry="8" fill="#4B7A3728" />
      <rect x="34" y="50" width="82" height="56" rx="10" fill={wallMain} stroke="#9D7651" strokeWidth="3.5" />
      <path d="M34 82 L116 82 L116 98 C102 103 87 106 75 106 C63 106 48 103 34 98 Z" fill={wallShade} opacity="0.74" />
      <path d="M24 58 L75 20 L126 58 L118 68 L75 36 L32 68 Z" fill={roofMain} stroke={roofDark} strokeWidth="3.5" />
      <rect x="96" y="26" width="11" height="20" rx="3" fill="#A87C56" stroke="#7C5A3D" strokeWidth="2.3" />
      <rect x="67" y="68" width="16" height="38" rx="3.5" fill="#BF8D5D" stroke="#845E3E" strokeWidth="2.6" />
      <circle cx="79" cy="87" r="1.6" fill={wallMain} />
      <rect x="44" y="65" width="16" height="15" rx="3" fill="#D8F0FF" stroke="#845E3E" strokeWidth="2.4" />
      <rect x="90" y="65" width="16" height="15" rx="3" fill="#D8F0FF" stroke="#845E3E" strokeWidth="2.4" />
      <line x1="52" y1="65" x2="52" y2="80" stroke="#845E3E" strokeWidth="1.9" />
      <line x1="44" y1="72.5" x2="60" y2="72.5" stroke="#845E3E" strokeWidth="1.9" />
      <line x1="98" y1="65" x2="98" y2="80" stroke="#845E3E" strokeWidth="1.9" />
      <line x1="90" y1="72.5" x2="106" y2="72.5" stroke="#845E3E" strokeWidth="1.9" />
    </svg>
  );
}

function BarnIcon() {
  return (
    <svg viewBox="0 0 158 136" className="h-[52px] w-[66px] sm:h-[66px] sm:w-[84px] md:h-[76px] md:w-[96px]">
      <ellipse cx="79" cy="124" rx="47" ry="8" fill="#4A793528" />
      <path d="M25 58 L79 24 L133 58 L118 58 L79 36 L40 58 Z" fill="#A73A36" stroke="#7D2926" strokeWidth="3.5" />
      <rect x="28" y="58" width="102" height="56" rx="8" fill="#D95A52" stroke="#8D332F" strokeWidth="3.5" />
      <rect x="68" y="70" width="22" height="44" rx="4" fill="#9E3D33" stroke="#752821" strokeWidth="2.5" />
      <line x1="79" y1="70" x2="79" y2="114" stroke="#D67669" strokeWidth="2.4" />
      <rect x="45" y="72" width="15" height="15" rx="3" fill="#FDECC8" stroke="#8A2F2B" strokeWidth="2.3" />
      <rect x="98" y="72" width="15" height="15" rx="3" fill="#FDECC8" stroke="#8A2F2B" strokeWidth="2.3" />
      <line x1="52.5" y1="72" x2="52.5" y2="87" stroke="#8A2F2B" strokeWidth="1.8" />
      <line x1="45" y1="79.5" x2="60" y2="79.5" stroke="#8A2F2B" strokeWidth="1.8" />
      <line x1="105.5" y1="72" x2="105.5" y2="87" stroke="#8A2F2B" strokeWidth="1.8" />
      <line x1="98" y1="79.5" x2="113" y2="79.5" stroke="#8A2F2B" strokeWidth="1.8" />
      <rect x="109" y="38" width="9" height="19" rx="2.5" fill="#8E5C3D" stroke="#6D442C" strokeWidth="2" />
    </svg>
  );
}

interface FenceSegmentProps {
  mirrored?: boolean;
}

function FenceSegment({ mirrored = false }: FenceSegmentProps) {
  return (
    <svg
      viewBox="0 0 120 58"
      className="h-[18px] w-[42px] sm:h-[22px] sm:w-[52px] md:h-[26px] md:w-[60px]"
      style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
    >
      <ellipse cx="60" cy="52" rx="47" ry="5" fill="#4F7E3823" />
      <rect x="18" y="24" width="84" height="8" rx="3" fill="#D7B58A" stroke="#9A714A" strokeWidth="2.2" />
      <rect x="16" y="35" width="88" height="8" rx="3" fill="#D7B58A" stroke="#9A714A" strokeWidth="2.2" />
      <rect x="20" y="13" width="9" height="33" rx="3" fill="#CFA67A" stroke="#8A623E" strokeWidth="2.2" />
      <rect x="56" y="11" width="9" height="35" rx="3" fill="#CFA67A" stroke="#8A623E" strokeWidth="2.2" />
      <rect x="91" y="13" width="9" height="33" rx="3" fill="#CFA67A" stroke="#8A623E" strokeWidth="2.2" />
    </svg>
  );
}

interface GrassTuftProps {
  className?: string;
  tone?: 'light' | 'dark';
}

function GrassTuft({ className = 'h-[14px] w-[28px] sm:h-[16px] sm:w-[32px] md:h-[18px] md:w-[36px]', tone = 'light' }: GrassTuftProps) {
  const bladeMain = tone === 'light' ? '#8CCB63' : '#76B255';
  const bladeShade = tone === 'light' ? '#71AF52' : '#639845';

  return (
    <svg viewBox="0 0 88 48" className={className}>
      <ellipse cx="44" cy="42" rx="30" ry="5.5" fill="#4779321e" />
      <path d="M14 38 C19 34 22 24 21 12 C25 22 28 31 32 38 Z" fill={bladeShade} />
      <path d="M30 39 C36 33 40 20 39 8 C45 20 49 32 53 39 Z" fill={bladeMain} />
      <path d="M50 39 C56 34 61 22 61 10 C65 21 68 33 74 39 Z" fill={bladeShade} />
      <path d="M38 40 C41 36 45 30 46 22 C49 30 52 36 56 40 Z" fill={bladeMain} />
    </svg>
  );
}

interface AnimalIconProps {
  className?: string;
}

function CowIcon({ className = 'h-[48px] w-[64px] sm:h-[62px] sm:w-[82px] md:h-[72px] md:w-[94px]' }: AnimalIconProps) {
  return (
    <svg viewBox="0 0 134 98" className={className}>
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

function SheepIcon({ className = 'h-[46px] w-[62px] sm:h-[60px] sm:w-[78px] md:h-[70px] md:w-[90px]' }: AnimalIconProps) {
  return (
    <svg viewBox="0 0 132 98" className={className}>
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

function BushIcon() {
  return (
    <svg viewBox="0 0 120 72" className="h-[24px] w-[32px] sm:h-[30px] sm:w-[40px] md:h-[34px] md:w-[46px]">
      <ellipse cx="60" cy="60" rx="44" ry="10" fill="#00000018" />
      <ellipse cx="34" cy="39" rx="21" ry="18" fill="#84BE61" />
      <ellipse cx="60" cy="31" rx="27" ry="22" fill="#97D277" />
      <ellipse cx="86" cy="40" rx="20" ry="17" fill="#7EB65B" />
    </svg>
  );
}

function FlowerPatch() {
  return (
    <svg viewBox="0 0 90 40" className="h-[14px] w-[30px] sm:h-[16px] sm:w-[34px] md:h-[18px] md:w-[38px]">
      <path d="M12 34 L12 30 M22 34 L22 22 M36 34 L36 28 M52 34 L52 20 M68 34 L68 26" stroke="#66A44A" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="28" r="4" fill="#FDE68A" />
      <circle cx="22" cy="20" r="3.6" fill="#FCA5A5" />
      <circle cx="36" cy="26" r="3.8" fill="#86EFAC" />
      <circle cx="52" cy="18" r="3.8" fill="#F9A8D4" />
      <circle cx="68" cy="24" r="3.6" fill="#BFDBFE" />
    </svg>
  );
}

export function FarmDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[8] overflow-hidden" aria-hidden="true">
      <div className="absolute left-[8%] top-[47.8%] opacity-80">
        <FenceSegment />
      </div>
      <div className="absolute right-[8%] top-[47.4%] opacity-80">
        <FenceSegment mirrored />
      </div>
      <div className="absolute left-[10%] bottom-[10.8%] opacity-78">
        <FenceSegment />
      </div>
      <div className="absolute right-[10%] bottom-[10.4%] opacity-78">
        <FenceSegment mirrored />
      </div>

      <div className="absolute left-[1.4%] top-[34.2%] drop-shadow-[0_2px_4px_rgba(67,109,50,0.2)]">
        <HouseIcon roof="red" />
      </div>
      <div className="absolute right-[1.4%] top-[33.8%] drop-shadow-[0_2px_4px_rgba(67,109,50,0.2)]">
        <BarnIcon />
      </div>
      <div className="absolute left-[1.8%] bottom-[2.4%] drop-shadow-[0_2px_4px_rgba(67,109,50,0.2)]">
        <BarnIcon />
      </div>
      <div className="absolute right-[1.8%] bottom-[2.8%] drop-shadow-[0_2px_4px_rgba(67,109,50,0.2)]">
        <HouseIcon roof="blue" />
      </div>

      <div className="absolute left-[0.8%] top-[66%] -translate-y-1/2 opacity-92">
        <CowIcon />
      </div>
      <div className="absolute right-[0.8%] top-[67.2%] -translate-y-1/2 opacity-92">
        <SheepIcon />
      </div>
      <div className="absolute left-[12.8%] bottom-[8.2%] opacity-88">
        <CowIcon className="h-[34px] w-[46px] sm:h-[44px] sm:w-[58px] md:h-[52px] md:w-[68px]" />
      </div>
      <div className="absolute right-[13.2%] bottom-[8%] opacity-88">
        <SheepIcon className="h-[32px] w-[44px] sm:h-[42px] sm:w-[56px] md:h-[50px] md:w-[64px]" />
      </div>

      <div className="absolute left-[1.8%] top-[45.4%] opacity-90">
        <BushIcon />
      </div>
      <div className="absolute right-[1.8%] top-[45.2%] opacity-90">
        <BushIcon />
      </div>
      <div className="absolute left-[6.6%] bottom-[14.2%] opacity-88">
        <BushIcon />
      </div>
      <div className="absolute right-[6.6%] bottom-[14%] opacity-88">
        <BushIcon />
      </div>

      <div className="absolute left-[8.5%] top-[55.8%] opacity-80">
        <FlowerPatch />
      </div>
      <div className="absolute right-[8.8%] top-[56.8%] opacity-80">
        <FlowerPatch />
      </div>
      <div className="absolute left-[17.5%] bottom-[12.2%] opacity-78">
        <FlowerPatch />
      </div>
      <div className="absolute right-[17.8%] bottom-[12%] opacity-78">
        <FlowerPatch />
      </div>

      <div className="absolute left-[3.2%] top-[41.2%] opacity-84">
        <GrassTuft tone="dark" />
      </div>
      <div className="absolute right-[3.2%] top-[40.8%] opacity-84">
        <GrassTuft tone="dark" />
      </div>
      <div className="absolute left-[4.2%] bottom-[6.8%] opacity-82">
        <GrassTuft />
      </div>
      <div className="absolute right-[4.2%] bottom-[6.6%] opacity-82">
        <GrassTuft />
      </div>
    </div>
  );
}
