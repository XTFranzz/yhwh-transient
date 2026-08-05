import type { ReactNode } from "react";
import { EmptyState } from "../../../../components/ui/Feedback";

export function ListingsGrid<T extends { _id: string }>({
  listings,
  renderCard,
  emptyTitle,
  emptyDescription,
}: {
  listings: T[] | undefined;
  renderCard: (item: T) => ReactNode;
  emptyTitle: string;
  emptyDescription?: string;
}) {
  if (listings === undefined) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="aspect-square animate-pulse rounded-2xl bg-ink-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-ink-100" />
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {listings.map((listing) => (
        <div key={listing._id}>{renderCard(listing)}</div>
      ))}
    </div>
  );
}
