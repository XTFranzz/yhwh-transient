import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { getErrorMessage } from "../../../lib/errors";
import { Icon } from "../../../components/ui/Icon";
import { Input, Select, Textarea } from "../../../components/ui/Input";
import { ErrorBanner } from "../../../components/ui/Feedback";

type Offering = "house" | "vehicle" | "tour" | "other";

const BENEFITS = [
  {
    icon: "people-fill",
    title: "More guests, less work",
    description: "We list you on our site and handle inquiries, bookings, and payments for you.",
  },
  {
    icon: "shield-check",
    title: "Guests you can trust",
    description: "Every booking goes through our team, with verified payments before check-in.",
  },
  {
    icon: "geo-alt-fill",
    title: "Local and hands-on",
    description: "We're based in Town Proper and a call away for you and your guests.",
  },
];

const EMPTY_FORM = { fullName: "", email: "", phone: "", offering: "house" as Offering, location: "", message: "" };

export function PartnerPage() {
  const submitApplication = useMutation(api.partners.submit);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await submitApplication({ ...form, message: form.message || undefined });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, "Could not send your application."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-[36rem] w-[48rem] rounded-full bg-[radial-gradient(closest-side,var(--color-brand-100),transparent)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">Be a Partner</span>
          <h1 className="mt-3 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-ink-900 sm:text-5xl">
            Grow with
            <br />
            <span className="text-brand-400">YHWH</span> Transient
          </h1>
          <p className="mt-5 max-w-md text-base text-ink-500">
            Own a house, a van or car, or run a tour around Town Proper? Partner with us and we'll bring the guests.
          </p>

          <div className="mt-10 flex flex-col gap-6">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <Icon name={benefit.icon} />
                </span>
                <div>
                  <p className="font-semibold text-ink-900">{benefit.title}</p>
                  <p className="text-sm text-ink-500">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-popover sm:p-8">
          {sent ? (
            <div className="flex flex-col items-start gap-4 py-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-xl text-teal-700">
                <Icon name="check-lg" />
              </span>
              <h2 className="text-xl font-semibold text-ink-900">Thanks, {form.fullName.split(" ")[0]}!</h2>
              <p className="text-sm text-ink-500">
                We got your application and will reach out at {form.email} or {form.phone} within a few days.
              </p>
              <Link to="/" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Back to home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink-900">Apply to partner</h2>
                <p className="mt-1 text-sm text-ink-500">Tell us a bit about what you'd like to list.</p>
              </div>
              <Input label="Full name" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="09XX-XXX-XXXX"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="What will you list?"
                  value={form.offering}
                  onChange={(e) => update("offering", e.target.value as Offering)}
                >
                  <option value="house">House / staycation</option>
                  <option value="vehicle">Vehicle (van, car)</option>
                  <option value="tour">Tour</option>
                  <option value="other">Something else</option>
                </Select>
                <Input
                  label="Location"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="Barangay, city"
                  required
                />
              </div>
              <Textarea
                label="Anything else? (optional)"
                rows={4}
                maxLength={1000}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="e.g. 3-bedroom house with parking, available weekends"
              />
              {error && <ErrorBanner message={error} />}
              <button
                type="submit"
                disabled={isSaving}
                className="mt-1 rounded-full bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Sending…" : "Send application"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
