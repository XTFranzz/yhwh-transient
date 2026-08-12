import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatMoney } from "../../../lib/format";
import { Button } from "../../../components/ui/Button";
import { Input, Select, Textarea } from "../../../components/ui/Input";
import { ErrorBanner, PageSpinner } from "../../../components/ui/Feedback";
import { Icon } from "../../../components/ui/Icon";
import { CustomerPicker, type CustomerValue } from "../customers/CustomerPicker";

type ListingType = "house" | "vehicle" | "tour";

const TYPE_TABS: { value: ListingType; label: string; icon: string }[] = [
  { value: "house", label: "House", icon: "house-door" },
  { value: "vehicle", label: "Vehicle", icon: "truck" },
  { value: "tour", label: "Tour", icon: "signpost-2" },
];

function addOneDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function NewReservationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inquiryId = searchParams.get("inquiryId") as Id<"inquiries"> | null;
  const customerIdParam = searchParams.get("customerId") as Id<"customers"> | null;

  const inquiry = useQuery(api.inquiries.getDetail, inquiryId ? { inquiryId } : "skip");
  const preloadedCustomer = useQuery(
    api.customers.get,
    customerIdParam && !inquiryId ? { customerId: customerIdParam } : "skip",
  );
  const [type, setType] = useState<ListingType>("house");
  const listings = useQuery(api.listings.list, { type });
  const createByStaff = useMutation(api.bookings.createByStaff);
  const convertInquiry = useMutation(api.inquiries.convertToBooking);

  const [listingId, setListingId] = useState<Id<"listings"> | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [customer, setCustomer] = useState<CustomerValue | null>(null);
  const [notes, setNotes] = useState("");
  const [markPaid, setMarkPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "bank_transfer" | "cash">("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Pre-fill everything from the inquiry once it loads, and lock the
  // type/listing choice since conversion is tied to that specific listing.
  useEffect(() => {
    if (!inquiry || prefilled) return;
    if (inquiry.listing) setType(inquiry.listing.type as ListingType);
    setListingId(inquiry.listingId);
    setStartDate(inquiry.startDate);
    setEndDate(inquiry.endDate);
    setGuestCount(inquiry.guestCount);
    if (inquiry.customer) {
      setCustomer({ fullName: inquiry.customer.fullName, email: inquiry.customer.email, phone: inquiry.customer.phone });
    }
    setNotes(inquiry.notes ?? "");
    setPrefilled(true);
  }, [inquiry, prefilled]);

  // Pre-fill the customer from a "New reservation for this customer" link
  // (from the customer detail page) — only when not converting an inquiry,
  // which already supplies its own customer.
  useEffect(() => {
    if (!preloadedCustomer?.customer || prefilled) return;
    setCustomer({
      fullName: preloadedCustomer.customer.fullName,
      email: preloadedCustomer.customer.email,
      phone: preloadedCustomer.customer.phone,
    });
  }, [preloadedCustomer, prefilled]);

  const today = new Date().toISOString().slice(0, 10);
  const selectedListing = listings?.find((l) => l._id === listingId);
  const isTour = type === "tour";
  const isConverting = Boolean(inquiryId);

  if (isConverting && inquiry === undefined) return <PageSpinner />;
  if (isConverting && inquiry === null) {
    return <ErrorBanner message="This inquiry could not be found." />;
  }

  const effectiveEndDate = isTour && startDate ? addOneDay(startDate) : endDate;
  const units =
    startDate && effectiveEndDate && effectiveEndDate > startDate
      ? Math.round((new Date(effectiveEndDate).getTime() - new Date(startDate).getTime()) / 86400000)
      : 0;
  const estimatedTotal = selectedListing
    ? isTour
      ? guestCount * selectedListing.basePriceCentavos
      : units * selectedListing.basePriceCentavos
    : 0;

  // Falls back to the computed estimate until the staff member overrides it —
  // used for both the input's displayed value and the actual submitted amount,
  // so the two never disagree.
  const resolvedPaymentAmount = paymentAmount || (estimatedTotal ? (estimatedTotal / 100).toFixed(2) : "");

  function handleTypeChange(next: ListingType) {
    setType(next);
    setListingId("");
    setStartDate("");
    setEndDate("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!listingId) {
      setError("Please select a listing.");
      return;
    }
    if (!startDate || (!isTour && !endDate)) {
      setError("Please select dates.");
      return;
    }
    if (!customer || !customer.fullName.trim() || !customer.email.trim() || !customer.phone.trim()) {
      setError("Please search for or add a customer.");
      return;
    }
    if (markPaid && (!resolvedPaymentAmount || Number(resolvedPaymentAmount) <= 0)) {
      setError("Please enter the amount received.");
      return;
    }

    setSubmitting(true);
    try {
      const initialPayment = markPaid
        ? { amountCentavos: Math.round(Number(resolvedPaymentAmount) * 100), method: paymentMethod }
        : undefined;

      const result = inquiryId
        ? await convertInquiry({
            inquiryId,
            startDate,
            endDate: effectiveEndDate,
            guestCount,
            customer,
            customerNotes: notes.trim() || undefined,
            initialPayment,
          })
        : await createByStaff({
            listingId,
            startDate,
            endDate: effectiveEndDate,
            guestCount,
            customer,
            customerNotes: notes.trim() || undefined,
            initialPayment,
          });
      navigate(`/admin/reservations/${result.bookingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold text-ink-900">
        {isConverting ? "Convert inquiry to booking" : "New reservation"}
      </h1>
      <p className="mb-6 text-sm text-ink-500">
        {isConverting
          ? "Confirm the details below with the guest, then create the booking."
          : "Log a booking taken over the phone, Messenger, or in person. Availability and pricing follow the same rules as the public site."}
      </p>

      <div className="mb-6 flex gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            disabled={isConverting}
            onClick={() => handleTypeChange(tab.value)}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
              type === tab.value ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50"
            }`}
          >
            <Icon name={tab.icon} /> {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select
          label="Listing"
          value={listingId}
          onChange={(e) => setListingId(e.target.value as Id<"listings">)}
          disabled={isConverting}
          required
        >
          <option value="">{listings === undefined ? "Loading…" : "Select a listing"}</option>
          {listings?.map((l) => (
            <option key={l._id} value={l._id}>
              {l.title} — {formatMoney(l.basePriceCentavos)}
              {isTour ? " / person" : type === "vehicle" ? " / day" : " / night"}
            </option>
          ))}
          {isConverting && inquiry?.listing && !listings?.some((l) => l._id === inquiry.listingId) && (
            <option value={inquiry.listingId}>{inquiry.listing.title}</option>
          )}
        </Select>

        {isTour ? (
          <Input
            label="Tour date"
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={type === "vehicle" ? "Pickup" : "Check-in"}
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label={type === "vehicle" ? "Return" : "Check-out"}
              type="date"
              min={startDate || today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        )}

        <Input
          label={isTour ? "Guests" : "Guest count"}
          type="number"
          min={1}
          max={selectedListing?.maxGuests}
          value={guestCount}
          onChange={(e) => setGuestCount(Number(e.target.value))}
          required
        />

        {estimatedTotal > 0 && (
          <p className="rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-700">
            Estimated total: <span className="font-semibold text-ink-900">{formatMoney(estimatedTotal)}</span>
          </p>
        )}

        <div className="mt-2 border-t border-ink-100 pt-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-800">Customer details</h2>
          <div className="flex flex-col gap-4">
            <CustomerPicker value={customer} onChange={setCustomer} />
            <Textarea
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Booked via Messenger, requested late check-out"
            />
          </div>
        </div>

        <div className="border-t border-ink-100 pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink-800">
            <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
            Record a payment now (optional — partial is fine)
          </label>
          {markPaid && (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Select label="Payment method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}>
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank transfer</option>
              </Select>
              <Input
                label="Amount received (₱)"
                type="number"
                min="0"
                step="0.01"
                value={resolvedPaymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required={markPaid}
              />
            </div>
          )}
          {markPaid && (
            <p className="mt-2 text-xs text-ink-500">
              Paying less than the total leaves the reservation "Pending payment" — the rest can be recorded later from
              the reservation detail page.
            </p>
          )}
          {!markPaid && (
            <p className="mt-2 text-xs text-ink-500">
              Reservation will be created as "Pending payment" — you can record payment later from the reservation detail page.
            </p>
          )}
        </div>

        {error && <ErrorBanner message={error} />}
        <Button type="submit" size="lg" isLoading={submitting}>
          {isConverting ? "Convert to booking" : "Create reservation"}
        </Button>
      </form>
    </div>
  );
}
