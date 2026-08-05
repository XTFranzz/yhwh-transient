import { Link } from "react-router-dom";
import { formatMoney } from "../../../../lib/format";
import { Icon } from "../../../../components/ui/Icon";

interface ListingCardProps {
  to: string;
  title: string;
  coverPhotoUrl: string | null;
  basePriceCentavos: number;
  priceSuffix: string;
  subtitle?: string;
  placeholderIcon?: string;
}

export function ListingCard({
  to,
  title,
  coverPhotoUrl,
  basePriceCentavos,
  priceSuffix,
  subtitle,
  placeholderIcon = "house-door",
}: ListingCardProps) {
  return (
    <Link to={to} className="group flex flex-col gap-3 rounded-2xl transition-transform duration-200 hover:-translate-y-1">
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-ink-100">
        {coverPhotoUrl ? (
          <img
            src={coverPhotoUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon name={placeholderIcon} className="text-4xl text-ink-300" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-semibold text-ink-900">{title}</p>
        </div>
        {subtitle && <p className="line-clamp-1 text-sm text-ink-500">{subtitle}</p>}
        <p className="mt-1 text-sm text-ink-900">
          <span className="font-semibold">{formatMoney(basePriceCentavos)}</span>{" "}
          <span className="text-ink-500">{priceSuffix}</span>
        </p>
      </div>
    </Link>
  );
}
