import { type ReactNode, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../../convex/_generated/api";
import { SearchBar } from "./components/SearchBar";
import { ListingsGrid } from "./components/ListingsGrid";
import { ListingCard } from "./components/ListingCard";
import { Icon } from "../../../components/ui/Icon";
import { PineTree } from "../../../components/ui/PineTree";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { StatusBadge } from "../../../components/ui/Badge";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";
import { formatDate, formatMoney, formatPaymentMethod, formatStatus } from "../../../lib/format";

// Cycles through the hero photo stack so it reads as a little slideshow of
// the kind of houses on offer, instead of two fixed photos.
const HERO_PHOTOS = [
  "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80", // log cabin in the forest
  "https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=800&q=80", // mountain hut at sunset
  "https://images.unsplash.com/photo-1521401830884-6c03c1c87ebb?auto=format&fit=crop&w=800&q=80", // treehouse
  "https://images.unsplash.com/photo-1506974210756-8e1b8985d348?auto=format&fit=crop&w=800&q=80", // log cabin, mountain backdrop
  "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80", // villa with pool
];
const HERO_PHOTO_INTERVAL_MS = 3200;

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
        <PineTree size={14} /> {eyebrow}
      </span>
      <h2 className="mt-2 font-serif text-2xl font-semibold text-ink-900 sm:text-3xl">{title}</h2>
      {description && <p className="mt-2 text-sm text-ink-500">{description}</p>}
    </div>
  );
}

// Every photo for this frame is already in the DOM, stacked — advancing just
// crossfades opacity between the current and next one, instead of swapping
// the src (which would just hard-cut, or popping a new element in).
function PhotoFrame({ photos, activeIndex, className }: { photos: string[]; activeIndex: number; className: string }) {
  return (
    <div className={`absolute overflow-hidden rounded-sm border-4 border-white bg-white shadow-popover ${className}`}>
      {photos.map((photo, i) => (
        <img
          key={photo}
          src={photo}
          alt="Staycation house, vehicle, or tour on offer"
          className={`absolute inset-0 h-full w-full rounded-[1px] object-cover transition-opacity duration-1000 ease-in-out ${
            i === activeIndex ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}

// A little "picking the next one" slideshow: every tick the back and front
// polaroids both crossfade to the next photo in the list, looping forever
// through the whole set.
function HeroPhotoStack({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % photos.length), HERO_PHOTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [photos.length]);

  return (
    <div className="relative mx-auto h-80 w-full max-w-sm sm:h-96">
      <PhotoFrame photos={photos} activeIndex={index % photos.length} className="left-0 top-0 h-full w-11/12 -rotate-3" />
      <PhotoFrame photos={photos} activeIndex={(index + 1) % photos.length} className="bottom-0 right-0 h-3/5 w-3/5 rotate-2" />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative border-b border-ink-800 bg-ink-900 px-4 pb-28 pt-16 sm:px-6 lg:px-8 lg:pt-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <PineTree className="absolute -left-2 bottom-24 text-ink-800" size={70} />
        <PineTree className="absolute left-16 bottom-16 hidden text-ink-800 sm:block" size={46} />
        <PineTree className="absolute right-6 top-10 hidden text-ink-800 lg:block" size={38} />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:items-center lg:gap-10">
        <HeroPhotoStack photos={HERO_PHOTOS} />

        <div className="flex flex-col items-start gap-6 text-left">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-400">
            <Icon name="geo-alt-fill" /> Town Proper
          </span>
          <h1 className="font-serif text-4xl font-semibold text-white sm:text-5xl">
            Reconnect with <em className="italic text-brand-300">Nature</em>
          </h1>
          <p className="text-base text-ink-300">Breathe in fresh air at our Town Proper cabin getaway.</p>
          <Link
            to="/#houses"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-white px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-ink-900"
          >
            Book Now
          </Link>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 translate-y-1/2 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <SearchBar />
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
    <section id={id} className={`px-4 py-16 sm:px-6 lg:px-8 ${tone === "tint" ? "bg-ink-50" : "bg-white"}`}>
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
      <SectionHeading
        eyebrow="Houses"
        title="Available houses"
        description="Handpicked transient houses, straight from the owner — no middleman, no fuss."
      />
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
          </div>
        )}
      </div>
    </SectionShell>
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
