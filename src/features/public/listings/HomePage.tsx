import { type ReactNode, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../../convex/_generated/api";
import { SearchBar } from "./components/SearchBar";
import { ListingsGrid } from "./components/ListingsGrid";
import { ListingCard } from "./components/ListingCard";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { Input, Textarea } from "../../../components/ui/Input";
import { StatusBadge } from "../../../components/ui/Badge";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";
import { formatDate, formatMoney, formatPaymentMethod, formatStatus } from "../../../lib/format";
import { getErrorMessage } from "../../../lib/errors";

const ABOUT_PHOTO = "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80";

const VEHICLE_ICON: Record<string, string> = { van: "truck", car: "car-front", motorcycle: "scooter" };

const ABOUT_VALUES = [
  {
    icon: "house-heart-fill",
    title: "Owner-managed",
    description: "Every house is run by its actual owner — no agency markup, no middleman.",
  },
  {
    icon: "shield-check",
    title: "Verified & ready",
    description: "We walk through each listing ourselves before it goes live, so it's always as pictured.",
  },
  {
    icon: "geo-alt-fill",
    title: "Town Proper locals",
    description: "Based in Town Proper — we know the area and are a call away during your stay.",
  },
];

// The whole public homepage lives in this one file as a long scroll: the
// header nav (see PublicLayout) jumps between these sections by id instead
// of routing to separate pages.
export function HomePage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <HousesSection />
      <VehiclesSection />
      <ToursSection />
      <MyBookingSection />
      <AboutSection />
      <ContactSection />
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-500">
        <span className="h-px w-6 bg-brand-400" aria-hidden="true" /> {eyebrow}
      </span>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{title}</h2>
      {description && <p className="mt-2 text-sm text-ink-500">{description}</p>}
    </div>
  );
}

// The YHWH crest, big, with the brand name set in its blank middle band (the
// same way the printed logo has it). yhwh-crest.png is yhwh-clear.png with
// its off-white background made transparent, so the hero's glow shows through.
function HeroCrest() {
  return (
    <div className="@container relative mx-auto aspect-square w-full max-w-[17rem] sm:max-w-md lg:max-w-lg">
      <img src="/yhwh-crest.png" alt="" className="h-full w-full" />
      {/* Band sits between ~50% and ~69% of the image height. */}
      <div className="absolute inset-x-[8%] top-[50%] flex h-[19%] flex-col items-center justify-center text-center">
        <span className="font-serif text-[7.2cqw] leading-none tracking-[0.18em] text-ink-900">YHWH TRANSIENT</span>
        <span className="mt-[1.5cqw] text-[3.4cqw] text-ink-600">Your Home With Harmony</span>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white px-4 pb-6 pt-10 sm:px-6 sm:pb-16 lg:px-8 lg:pb-24 lg:pt-16">
      {/* Soft warm glow behind the headline, like a sunlit wash. */}
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-[42rem] w-[56rem] rounded-full bg-[radial-gradient(closest-side,var(--color-brand-100),transparent)] opacity-90"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 top-10 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(closest-side,var(--color-brand-50),transparent)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl gap-8 sm:gap-12 lg:grid-cols-2 lg:items-center lg:gap-8">
        <div className="flex flex-col items-start gap-7">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-500">
            <Icon name="geo-alt-fill" /> Town Proper
          </span>
          <h1 className="text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-ink-900 sm:text-6xl lg:text-7xl">
            Your Home
            <br />
            <span className="text-brand-400">With</span>
            <br />
            Harmony
          </h1>
          <p className="max-w-md text-base text-ink-500">
            Staycation houses, van &amp; car rentals, and city tours — all based right in Town Proper.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/#houses"
              className="rounded-full bg-brand-500 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
            >
              Book Now
            </Link>
            <Link
              to="/partner"
              className="rounded-full border-2 border-brand-400 px-8 py-3 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
            >
              Become a Partner
            </Link>
          </div>
        </div>

        <div className="relative">
          <HeroCrest />
          {/* Overlaps the bottom of the crest, like the reference's search bar. */}
          <div className="relative z-10 -mt-10 sm:-mt-20">
            <SearchBar />
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionShell({
  id,
  tone,
  children,
}: {
  id: string;
  tone: "white" | "tint";
  children: ReactNode;
}) {
  return (
    <section id={id} className={`px-4 py-12 sm:px-6 sm:py-16 lg:px-8 ${tone === "tint" ? "bg-ink-50" : "bg-white"}`}>
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </section>
  );
}

function AboutSection() {
  return (
    <SectionShell id="about" tone="white">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <SectionHeading
            eyebrow="About us"
            title="A staycation run by the owners, not an agency"
            description="YHWH Transient started with a single family house in Town Proper. We still hand-pick every house, vehicle, and tour on the site, and we're the ones you'll actually talk to when you book."
          />
          <div className="grid gap-6 sm:grid-cols-3">
            {ABOUT_VALUES.map((value) => (
              <div key={value.title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-300 text-brand-600">
                  <Icon name={value.icon} />
                </span>
                <p className="mt-3 text-sm font-semibold text-ink-900">{value.title}</p>
                <p className="mt-1 text-sm text-ink-500">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl shadow-card">
          <img src={ABOUT_PHOTO} alt="Interior of a YHWH Transient staycation house" className="h-72 w-full object-cover sm:h-96" />
        </div>
      </div>
    </SectionShell>
  );
}

function HousesSection() {
  const listings = useQuery(api.listings.list, { type: "house" });

  return (
    <SectionShell id="houses" tone="white">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Featured</h2>
          <Link
            to="/search"
            className="shrink-0 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 sm:px-6 sm:py-2.5"
          >
            View All
          </Link>
        </div>
        <p className="mt-2 text-sm text-ink-500">
          Handpicked transient houses, straight from the owner — no middleman, no fuss.
        </p>
      </div>
      <ListingsGrid
        listings={listings}
        emptyTitle="No houses available"
        emptyDescription="Check back soon — new houses are added regularly."
        renderCard={(listing) => (
          <ListingCard
            to={`/listings/${listing.slug}`}
            title={listing.title}
            coverPhotoUrl={listing.coverPhotoUrl}
            basePriceCentavos={listing.basePriceCentavos}
            priceSuffix="/ night"
            placeholderIcon="house-door"
            subtitle={
              listing.details
                ? `${listing.details.bedrooms} bed · ${listing.details.bathrooms} bath · up to ${listing.maxGuests} guests`
                : undefined
            }
          />
        )}
      />
    </SectionShell>
  );
}

function VehiclesSection() {
  const listings = useQuery(api.listings.list, { type: "vehicle" });

  return (
    <SectionShell id="vehicles" tone="tint">
      <SectionHeading
        eyebrow="Vehicles"
        title="Van & car rental"
        description="Self-drive or with-driver rentals, by the day."
      />
      <ListingsGrid
        listings={listings}
        emptyTitle="No vehicles available yet"
        emptyDescription="Check back soon for van and car rental options."
        renderCard={(listing) => (
          <ListingCard
            to={`/vehicles/${listing.slug}`}
            title={listing.title}
            coverPhotoUrl={listing.coverPhotoUrl}
            basePriceCentavos={listing.basePriceCentavos}
            priceSuffix="/ day"
            placeholderIcon={listing.details ? VEHICLE_ICON[listing.details.vehicleType] : "truck"}
            subtitle={
              listing.details
                ? `${listing.details.seats} seats · ${listing.details.transmission}${listing.details.withDriver ? " · with driver" : ""}`
                : undefined
            }
          />
        )}
      />
    </SectionShell>
  );
}

function ToursSection() {
  const listings = useQuery(api.listings.list, { type: "tour" });

  return (
    <SectionShell id="tours" tone="white">
      <SectionHeading
        eyebrow="Tours"
        title="City tours"
        description="Guided day tours around the city, priced per person."
      />
      <ListingsGrid
        listings={listings}
        emptyTitle="No tours available yet"
        emptyDescription="Check back soon for guided city tours."
        renderCard={(listing) => (
          <ListingCard
            to={`/tours/${listing.slug}`}
            title={listing.title}
            coverPhotoUrl={listing.coverPhotoUrl}
            basePriceCentavos={listing.basePriceCentavos}
            priceSuffix="/ person"
            placeholderIcon="signpost-2"
            subtitle={
              listing.details
                ? `${listing.details.durationHours}h · min ${listing.details.minPax} pax · up to ${listing.maxGuests}`
                : undefined
            }
          />
        )}
      />
    </SectionShell>
  );
}

function MyBookingSection() {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<{ referenceNumber: string; email: string } | null>(null);

  const result = useQuery(api.bookings.lookupByReferenceAndEmail, submitted ?? "skip");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted({ referenceNumber: referenceNumber.trim(), email: email.trim() });
  }

  return (
    <SectionShell id="my-booking" tone="tint">
      <SectionHeading
        eyebrow="My booking"
        title="Manage my booking"
        description="Enter your booking reference and the email you booked with."
      />
      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Booking reference"
            placeholder="YHWH-XXXXXX"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            required
          />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" className="self-start">
            Look up booking
          </Button>
        </form>

        {submitted && result === undefined && <PageSpinner />}
        {submitted && result === null && (
          <div className="mt-6">
            <ErrorBanner message="We couldn't find a booking with that reference and email. Please double-check and try again." />
          </div>
        )}
        {result && (
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-ink-900">{result.listing?.title}</p>
                <p className="text-sm text-ink-500">Ref: {result.booking.referenceNumber}</p>
              </div>
              <StatusBadge status={result.booking.status} label={formatStatus(result.booking.status)} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-ink-600">
              <div>
                <p className="text-ink-400">Check-in</p>
                <p>{formatDate(result.booking.startDate)}</p>
              </div>
              <div>
                <p className="text-ink-400">Check-out</p>
                <p>{formatDate(result.booking.endDate)}</p>
              </div>
              <div>
                <p className="text-ink-400">Guests</p>
                <p>{result.booking.guestCount}</p>
              </div>
              <div>
                <p className="text-ink-400">Total</p>
                <p className="font-medium text-ink-900">{formatMoney(result.booking.totalCentavos)}</p>
              </div>
            </div>

            {result.payments.length > 0 && (
              <div className="border-t border-ink-100 pt-3">
                <p className="mb-2 text-sm font-medium text-ink-800">Payment history</p>
                <ul className="flex flex-col gap-2">
                  {result.payments.map((p) => (
                    <li key={p._id} className="flex items-center justify-between text-sm text-ink-600">
                      <span>
                        {formatMoney(p.amountCentavos)} via {formatPaymentMethod(p.method)}
                      </span>
                      <StatusBadge status={p.status} label={formatStatus(p.status)} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.booking.status === "pending_payment" && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Your booking is awaiting payment verification. We'll update this page once it's confirmed.
              </p>
            )}

            {submitted && result.booking.status === "checked_out" && (
              <GuestReviewForm lookup={submitted} existingStatus={result.review?.status ?? null} />
            )}
          </div>
        )}
      </div>
    </SectionShell>
  );
}

function GuestReviewForm({
  lookup,
  existingStatus,
}: {
  lookup: { referenceNumber: string; email: string };
  existingStatus: string | null;
}) {
  const submitReview = useMutation(api.reviews.submitByGuest);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existingStatus) {
    return (
      <p className="rounded-xl bg-teal-50 px-3 py-2 text-xs text-teal-800">
        {existingStatus === "approved"
          ? "Thanks for your review — it's now live on our site!"
          : "Thanks for your review! We'll publish it once our team has had a look."}
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please choose a star rating.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await submitReview({ ...lookup, rating, comment });
    } catch (err) {
      setError(getErrorMessage(err, "Could not send your review."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-ink-100 pt-4">
      <p className="text-sm font-medium text-ink-800">How was your stay?</p>
      <div className="flex gap-1 text-2xl text-amber-500">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className="cursor-pointer transition-transform hover:scale-110"
          >
            <Icon name={star <= rating ? "star-fill" : "star"} />
          </button>
        ))}
      </div>
      <Textarea
        label="Your review"
        rows={3}
        maxLength={500}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What did you like about it?"
        required
      />
      {error && <ErrorBanner message={error} />}
      <Button type="submit" size="sm" className="self-start" isLoading={isSaving}>
        Submit review
      </Button>
    </form>
  );
}

const CONTACT_ITEMS = [
  { icon: "telephone-fill", label: "Phone / Viber / WhatsApp", value: "0917-123-4567" },
  { icon: "envelope-fill", label: "Email", value: "hello@yhwh-transient.example" },
  { icon: "clock-fill", label: "Office hours", value: "Daily, 8:00 AM – 8:00 PM" },
];

function ContactSection() {
  return (
    <SectionShell id="contact" tone="tint">
      <SectionHeading
        eyebrow="Contact"
        title="Contact us"
        description="Have questions about a house, availability, or your booking? Reach out and we'll get back to you."
      />
      <div className="flex max-w-xl flex-col gap-6 rounded-2xl border border-ink-100 p-6">
        {CONTACT_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-300 text-brand-600">
              <Icon name={item.icon} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-900">{item.label}</p>
              <p className="text-sm text-ink-600">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
