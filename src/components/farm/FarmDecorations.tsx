/**
 * FarmDecorations - Corner props and animals around the farm.
 *
 * Keeps decorative elements outside the playable plot area and scales
 * down on small screens so the grid remains clear.
 */

function HouseIcon() {
  return (
    <svg viewBox="0 0 132 118" className="h-[82px] w-[92px] sm:h-[94px] sm:w-[108px] md:h-[106px] md:w-[120px]">
      <rect x="26" y="44" width="80" height="58" rx="9" fill="#F8ECD8" stroke="#9B7551" strokeWidth="4" />
      <path d="M18 53 L66 18 L114 53 L107 61 L66 29 L25 61 Z" fill="#E58E4D" stroke="#A76539" strokeWidth="4" />
      <rect x="59" y="66" width="14" height="36" rx="3" fill="#B98555" stroke="#8A613E" strokeWidth="3" />
      <rect x="38" y="62" width="15" height="14" rx="3" fill="#CDEAF7" stroke="#8A613E" strokeWidth="3" />
      <rect x="79" y="62" width="15" height="14" rx="3" fill="#CDEAF7" stroke="#8A613E" strokeWidth="3" />
      <rect x="88" y="24" width="8" height="18" rx="2" fill="#9F7652" stroke="#7A573A" strokeWidth="2.5" />
    </svg>
  );
}

function BarnIcon() {
  return (
    <svg viewBox="0 0 136 118" className="h-[84px] w-[96px] sm:h-[96px] sm:w-[110px] md:h-[108px] md:w-[124px]">
      <rect x="22" y="40" width="92" height="64" rx="10" fill="#D85D4E" stroke="#8F3B30" strokeWidth="4" />
      <path d="M16 48 L68 18 L120 48 L113 58 L68 30 L23 58 Z" fill="#B54F45" stroke="#7A322A" strokeWidth="4" />
      <rect x="54" y="58" width="28" height="46" rx="4" fill="#F5E7D2" stroke="#8F3B30" strokeWidth="3.5" />
      <line x1="54" y1="82" x2="82" y2="58" stroke="#8F3B30" strokeWidth="3" />
      <line x1="54" y1="58" x2="82" y2="82" stroke="#8F3B30" strokeWidth="3" />
      <rect x="56" y="30" width="24" height="18" rx="3" fill="#F5E7D2" stroke="#8F3B30" strokeWidth="3.5" />
      <line x1="56" y1="39" x2="80" y2="39" stroke="#8F3B30" strokeWidth="3" />
      <line x1="68" y1="30" x2="68" y2="48" stroke="#8F3B30" strokeWidth="3" />
    </svg>
  );
}

function FenceSegment({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <svg
      viewBox="0 0 70 38"
      className="h-[30px] w-[62px] sm:h-[34px] sm:w-[70px]"
      style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
    >
      <rect x="6" y="7" width="10" height="28" rx="3" fill="#C69866" stroke="#8E6542" strokeWidth="2.5" />
      <rect x="54" y="7" width="10" height="28" rx="3" fill="#C69866" stroke="#8E6542" strokeWidth="2.5" />
      <rect x="14" y="14" width="42" height="6" rx="3" fill="#D2A977" stroke="#8E6542" strokeWidth="2" />
      <rect x="14" y="23" width="42" height="6" rx="3" fill="#D2A977" stroke="#8E6542" strokeWidth="2" />
    </svg>
  );
}

export function FarmDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[14]" aria-hidden="true">
      <div className="absolute left-[2%] top-[30%]">
        <HouseIcon />
      </div>
      <div className="absolute left-[1%] bottom-[6%] hidden sm:block">
        <HouseIcon />
      </div>
      <div className="absolute right-[2%] top-[30%]">
        <BarnIcon />
      </div>
      <div className="absolute right-[1%] bottom-[6%] hidden sm:block">
        <BarnIcon />
      </div>

      <div className="absolute left-[12%] top-[42%]">
        <FenceSegment />
      </div>
      <div className="absolute left-[14%] bottom-[20%] hidden sm:block">
        <FenceSegment />
      </div>
      <div className="absolute right-[12%] top-[42%]">
        <FenceSegment mirrored />
      </div>
      <div className="absolute right-[13%] bottom-[20%] hidden sm:block">
        <FenceSegment mirrored />
      </div>

      <span
        className="absolute left-[10%] bottom-[8%] text-[34px] sm:text-[38px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
      >
        🐄
      </span>
      <span
        className="absolute left-[15%] bottom-[6%] hidden sm:block text-[32px] md:text-[36px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
      >
        🐄
      </span>
      <span
        className="absolute right-[10%] bottom-[8%] text-[32px] sm:text-[36px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
      >
        🐑
      </span>
      <span
        className="absolute right-[15%] bottom-[6%] hidden sm:block text-[30px] md:text-[34px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
      >
        🐑
      </span>
    </div>
  );
}
