import { Link, useLocation } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";

type ListingType = "house" | "vehicle" | "tour";

interface LocationState {
  listingTitle?: string;
  listingType?: ListingType;
}

// What else a guest might want for the same trip, besides what they just
// inquired about — their contact info carries over, so picking one of these
// skips straight to the listing without retyping anything.
const OTHER_CATEGORIES: Record<ListingType, { to: string; icon: string; label: string }[]> = {
  house: [
    { to: "/vehicles", icon: "truck", label: "Browse vehicles" },
    { to: "/tours", icon: "signpost-2", label: "Browse tours" },
  ],
  vehicle: [
    { to: "/", icon: "house-door", label: "Browse houses" },
    { to: "/tours", icon: "signpost-2", label: "Browse tours" },
  ],
  tour: [
    { to: "/", icon: "house-door", label: "Browse houses" },
    { to: "/vehicles", icon: "truck", label: "Browse vehicles" },
  ],
};

export function InquirySentPage() {
  const location = useLocation();
  const { listingTitle, listingType } = (location.state as LocationState) ?? {};
  const otherCategories = listingType ? OTHER_CATEGORIES[listingType] : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-900 text-3xl text-white">
        <Icon name="chat-dots-fill" />
      </span>
      <h1 className="text-2xl font-semibold text-ink-900">Inquiry sent!</h1>
      <p className="max-w-md text-ink-600">
        {listingTitle ? (
          <>
            Thanks for your interest in <strong className="text-ink-900">{listingTitle}</strong>. Our team will
            reach out by email or phone shortly to confirm availability and arrange payment.
          </>
        ) : (
          "Thanks for reaching out. Our team will contact you shortly to confirm availability and arrange payment."
        )}
      </p>
      <p className="text-sm text-ink-500">No payment is needed until we've confirmed the details with you.</p>
      <div className="mt-4 flex gap-3">
        <Link to="/">
          <Button>Back to home</Button>
        </Link>
        <Link to="/#contact">
          <Button variant="outline">Contact us directly</Button>
        </Link>
      </div>

      {otherCategories && (
        <div className="mt-6 w-full rounded-2xl border border-dashed border-ink-200 p-5">
          <p className="text-sm font-medium text-ink-800">Need a vehicle or a tour for the same trip?</p>
          <p className="mt-1 text-xs text-ink-500">
            Send a separate inquiry — we've kept your name, email, and phone number so you won't have to
            retype them.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {otherCategories.map((c) => (
              <Link key={c.to} to={c.to}>
                <Button variant="outline" size="sm">
                  <Icon name={c.icon} /> {c.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
