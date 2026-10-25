import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "./ui/Icon";

// The splash screen (SplashScreen.tsx) runs ~3.2s, so the first popup waits it out.
const FIRST_DELAY_MS = 4500;
const VISIBLE_MS = 3000; // on screen after the slide-in finishes
const GAP_MS = 6000;
const EXIT_MS = 500; // matches --animate-popup-out in index.css

const LISTING_PATH: Record<string, string> = { house: "/listings", vehicle: "/vehicles", tour: "/tours" };

type FeedItem =
  | { kind: "booking"; key: string; name: string; listingTitle: string; listingType: string; listingSlug: string; subtitle: string; createdAt: number }
  | { kind: "review"; key: string; name: string; listingTitle: string; listingType: string; listingSlug: string; rating: number; comment: string };

function timeAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

// Top-corner popups (just under the header) on the public site that take
// turns showing a recent booking ("R*** T. booked Malaya Villa") and an
// approved guest review. Closing one hides them only until the next page
// load — every refresh starts the cycle again, from a random item.
export function SocialProofPopup() {
  const feed = useQuery(api.reviews.feed);
  const [dismissed, setDismissed] = useState(false);
  const [startOffset] = useState(() => Math.floor(Math.random() * 1000));
  const [index, setIndex] = useState(0);
  // hidden → in (slides in, stays VISIBLE_MS) → out (slides away) → hidden
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  const [hovered, setHovered] = useState(false);

  // Alternate bookings and reviews so neither kind dominates.
  const items = useMemo<FeedItem[]>(() => {
    if (!feed) return [];
    const bookings = feed.bookings.map((b) => ({ kind: "booking" as const, ...b }));
    const reviews = feed.reviews.map((r) => ({ kind: "review" as const, ...r }));
    const mixed: FeedItem[] = [];
    for (let i = 0; i < Math.max(bookings.length, reviews.length); i++) {
      if (bookings[i]) mixed.push(bookings[i]);
      if (reviews[i]) mixed.push(reviews[i]);
    }
    return mixed;
  }, [feed]);

  const hasItems = items.length > 0;

  useEffect(() => {
    if (phase === "out") {
      const timer = setTimeout(() => setPhase("hidden"), EXIT_MS);
      return () => clearTimeout(timer);
    }
    if (dismissed || !hasItems) return;
    if (phase === "in") {
      if (hovered) return; // hovering keeps it on screen
      const timer = setTimeout(() => setPhase("out"), VISIBLE_MS + 650);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(
      () => {
        setIndex((i) => i + 1);
        setPhase("in");
      },
      index === 0 ? FIRST_DELAY_MS : GAP_MS,
    );
    return () => clearTimeout(timer);
  }, [dismissed, hasItems, hovered, phase, index]);

  if (phase === "hidden" || !hasItems) return null;
  // index counts popups shown so far (bumped just before each one appears).
  const item = items[(startOffset + index - 1) % items.length];

  return (
    <div
      className={`fixed left-3 right-3 top-[4.75rem] z-30 sm:left-6 sm:right-auto sm:top-24 sm:w-96 ${
        phase === "in" ? "animate-popup-in" : "pointer-events-none animate-popup-out"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-3 pr-10 shadow-popover sm:p-4 sm:pr-10">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
          {item.kind === "review" ? <Icon name="star-fill" className="text-amber-500" /> : item.name[0]}
        </span>
        <Link to={`${LISTING_PATH[item.listingType]}/${item.listingSlug}`} className="min-w-0 flex-1" onClick={() => setPhase("out")}>
          {item.kind === "booking" ? (
            <>
              <p className="text-sm text-ink-700">
                <span className="font-semibold text-ink-900">{item.name}</span> booked{" "}
                <span className="font-semibold text-ink-900">{item.listingTitle}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-500">
                {item.subtitle} · {timeAgo(item.createdAt)}
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-0.5 text-xs text-amber-500" aria-label={`${item.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Icon key={i} name={i < item.rating ? "star-fill" : "star"} />
                ))}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-ink-700">"{item.comment}"</p>
              <p className="mt-0.5 truncate text-xs text-ink-500">
                {item.name} · {item.listingTitle}
              </p>
            </>
          )}
        </Link>
        <button
          onClick={() => {
            setDismissed(true);
            setPhase("out");
          }}
          className="absolute right-3 top-3 rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          aria-label="Close"
        >
          <Icon name="x-lg" />
        </button>
      </div>
    </div>
  );
}
