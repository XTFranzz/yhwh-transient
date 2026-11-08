import type { ReactNode } from "react";
import { EmptyState } from "../../../../components/ui/Feedback";

// Below md, a section that passes renderMobileCard shows a swipeable row of
// tall cards (the "app" look); md and up always get the regular grid.
export function ListingsGrid<T extends { _id: string }>({
  listings,
  renderCard,
  renderMobileCard,
  emptyTitle,
  emptyDescription,
}: {
  listings: T[] | undefined;
  renderCard: (item: T) => ReactNode;
  renderMobileCard?: (item: T) => ReactNode;
  emptyTitle: string;
  emptyDescription?: string;
}) {
  if (listings === undefined) {
    return (
      <>
        {renderMobileCard && (
          <div className="-mx-4 flex gap-4 overflow-hidden px-4 md:hidden">
            {[0, 1].map((i) => (
              <div key={i} className="aspect-[4/5] w-[72%] shrink-0 animate-pulse rounded-[1.75rem] bg-ink-100" />
            ))}
          </div>
        )}
        <div className={`grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 ${renderMobileCard ? "hidden md:grid" : "grid"}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-[4/3] animate-pulse rounded-xl bg-ink-100" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-ink-100" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (listings.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      {renderMobileCard && (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
          {listings.map((listing) => (
            <div key={listing._id} className="w-[72%] max-w-xs shrink-0 snap-start">
              {renderMobileCard(listing)}
            </div>
          ))}
        </div>
      )}
      <div className={`grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 ${renderMobileCard ? "hidden md:grid" : "grid"}`}>
        {listings.map((listing) => (
          <div key={listing._id}>{renderCard(listing)}</div>
        ))}
      </div>
    </>
  );
}
