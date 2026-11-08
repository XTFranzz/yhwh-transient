import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatMoney } from "../../../../lib/format";
import { Icon } from "../../../../components/ui/Icon";

interface Photo {
  id: string;
  url: string | null;
}

interface ListingMediaProps {
  title: string;
  subtitle?: string;
  photos: Photo[];
  placeholderIcon: string;
}

// Title + photos for the house/vehicle/tour detail pages.
// md and up: the original heading and 5-photo grid.
// Phones: an app-style full-width photo with the title over it, then a
// "Photo gallery" strip whose "View all" opens every photo full screen.
export function ListingMedia({ title, subtitle, photos, placeholderIcon }: ListingMediaProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const usable = photos.filter((p): p is Photo & { url: string } => Boolean(p.url));
  const cover = usable[0];

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden md:block">
        <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        {usable.length > 0 ? (
          <div className="mt-4 grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
            {usable.slice(0, 5).map((photo, i) => (
              <img
                key={photo.id}
                src={photo.url}
                alt={title}
                className={`h-64 w-full object-cover ${i === 0 ? "col-span-2 row-span-2 h-full" : ""}`}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex h-64 w-full items-center justify-center rounded-2xl bg-ink-100">
            <Icon name={placeholderIcon} className="text-5xl text-ink-300" />
          </div>
        )}
      </div>

      {/* Phones */}
      <div className="md:hidden">
        <div className="relative -mx-4 -mt-8 h-[26rem] overflow-hidden rounded-b-[2rem] bg-brand-100">
          {cover ? (
            <button type="button" onClick={() => setViewerIndex(0)} className="absolute inset-0" aria-label="View photos">
              <img src={cover.url} alt={title} className="h-full w-full object-cover" />
            </button>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-200 to-brand-400">
              <Icon name={placeholderIcon} className="text-7xl text-white/70" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-900/85 to-transparent" />
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-ink-900 shadow-sm"
            aria-label="Back"
          >
            <Icon name="chevron-left" />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6">
            <h1 className="text-[1.7rem] font-bold leading-tight text-white">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/85">
                <Icon name="geo-alt-fill" className="text-xs" /> {subtitle}
              </p>
            )}
          </div>
        </div>

        {usable.length > 1 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">Photo gallery</h2>
              <button type="button" onClick={() => setViewerIndex(0)} className="text-sm font-semibold text-brand-600">
                View all
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {usable.slice(0, 4).map((photo, i) => {
                const extra = usable.length - 4;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setViewerIndex(i)}
                    className="relative aspect-square overflow-hidden rounded-2xl"
                  >
                    <img src={photo.url} alt="" className="h-full w-full object-cover" />
                    {i === 3 && extra > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center bg-ink-900/55 text-sm font-semibold text-white">
                        {extra}+
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {viewerIndex !== null && (
        <PhotoViewer photos={usable} startIndex={viewerIndex} title={title} onClose={() => setViewerIndex(null)} />
      )}
    </>
  );
}

// Full-screen, vertically scrolling list of every photo, opened at the tapped one.
function PhotoViewer({
  photos,
  startIndex,
  title,
  onClose,
}: {
  photos: { id: string; url: string }[];
  startIndex: number;
  title: string;
  onClose: () => void;
}) {
  const refs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    refs.current[startIndex]?.scrollIntoView({ block: "start" });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [startIndex, onClose]);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink-900 animate-fade-in" role="dialog" aria-label={`${title} photos`}>
      <div className="sticky top-0 z-10 flex items-center justify-between bg-ink-900/90 px-4 py-3 backdrop-blur">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Close photos"
        >
          <Icon name="x-lg" />
        </button>
      </div>
      <div className="mx-auto flex max-w-3xl flex-col gap-2 p-2 pb-8">
        {photos.map((photo, i) => (
          <img
            key={photo.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            src={photo.url}
            alt={title}
            className="w-full scroll-mt-16 rounded-xl object-cover"
          />
        ))}
      </div>
    </div>
  );
}

// Phone-only fixed bar at the bottom of detail pages: price + "Book now",
// which scrolls to the booking card (id="book").
export function MobileBookBar({ basePriceCentavos, priceSuffix }: { basePriceCentavos: number; priceSuffix: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-ink-900">{formatMoney(basePriceCentavos)}</p>
          <p className="text-xs text-ink-500">{priceSuffix}</p>
        </div>
        <button
          type="button"
          onClick={() => document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="rounded-2xl bg-ink-900 px-10 py-4 text-sm font-semibold text-white shadow-sm active:bg-black"
        >
          Book now
        </button>
      </div>
    </div>
  );
}
