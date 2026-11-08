import { Link } from "react-router-dom";
import { formatMoney } from "../../../../lib/format";
import { Icon } from "../../../../components/ui/Icon";

interface MobileListingCardProps {
  to: string;
  title: string;
  coverPhotoUrl: string | null;
  meta?: string;
  metaIcon?: string;
  basePriceCentavos: number;
  priceSuffix: string;
  placeholderIcon?: string;
}

// Phone-only card for the swipeable rows on the homepage: a tall photo with
// the title and a meta line (location, seats…) over a dark fade, and the price in a pill up top.
export function MobileListingCard({
  to,
  title,
  coverPhotoUrl,
  meta,
  metaIcon = "geo-alt-fill",
  basePriceCentavos,
  priceSuffix,
  placeholderIcon = "house-door",
}: MobileListingCardProps) {
  return (
    <Link to={to} className="relative block aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-brand-100 shadow-card">
      {coverPhotoUrl ? (
        <img src={coverPhotoUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-200 to-brand-400">
          <Icon name={placeholderIcon} className="text-6xl text-white/70" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-900/85 via-ink-900/30 to-transparent" />

      <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink-900 shadow-sm">
        {formatMoney(basePriceCentavos)} <span className="font-normal text-ink-500">{priceSuffix}</span>
      </span>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="line-clamp-2 text-xl font-bold leading-tight text-white">{title}</p>
        {meta && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/85">
            <Icon name={metaIcon} className="text-xs" />
            <span className="line-clamp-1">{meta}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
