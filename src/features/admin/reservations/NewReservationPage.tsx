import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatMoney } from "../../../lib/format";
import { getErrorMessage } from "../../../lib/errors";
import { Button } from "../../../components/ui/Button";
import { Input, Select, Textarea } from "../../../components/ui/Input";
import { ErrorBanner, PageSpinner } from "../../../components/ui/Feedback";
import { Icon } from "../../../components/ui/Icon";
import { CustomerPicker, type CustomerValue } from "../customers/CustomerPicker";

type ListingType = "house" | "vehicle" | "tour";
type PaymentMethod = "gcash" | "bank_transfer" | "cash";

const TYPE_META: Record<ListingType, { label: string; icon: string; unit: string }> = {
  house: { label: "House", icon: "house-door", unit: "night" },
  vehicle: { label: "Vehicle", icon: "truck", unit: "day" },
  tour: { label: "Tour", icon: "signpost-2", unit: "guest" },
};
const STEP_TYPES: ListingType[] = ["house", "vehicle", "tour"];

interface ItemFields {
  listingId: Id<"listings"> | "";
  startDate: string;
  endDate: string;
  guestCount: number;
}
function emptyItemFields(): ItemFields {
  return { listingId: "", startDate: "", endDate: "", guestCount: 1 };
}

function addOneDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

interface ListingOption {
  _id: Id<"listings">;
  title: string;
  basePriceCentavos: number;
  maxGuests: number;
}

interface LineItem {
  type: ListingType;
  listing: ListingOption;
  fields: ItemFields;
  endDate: string;
  quantity: number;
  totalCentavos: number;
}

interface CreatedBooking {
  type: ListingType;
  referenceNumber: string;
  bookingId: Id<"bookings">;
}

// Listing + dates + guest count for one type — reused by both the inquiry
// conversion form (a single locked type) and each step of the new-reservation
// wizard (one per type, all optional).
function ListingFieldsEditor({
  type,
  fields,
  onChange,
  listings,
  today,
  lockListing,
  extraOption,
}: {
  type: ListingType;
  fields: ItemFields;
  onChange: (patch: Partial<ItemFields>) => void;
  listings: ListingOption[] | undefined;
  today: string;
  // Only locks which listing is picked — dates and guest count stay editable
  // even when converting an inquiry, since the originally-requested dates
  // might turn out to be unavailable and staff need to adjust them.
  lockListing?: boolean;
  extraOption?: { id: Id<"listings">; title: string } | null;
}) {
  const isTour = type === "tour";
  const selectedListing = listings?.find((l) => l._id === fields.listingId);
  const unit = isTour ? "person" : TYPE_META[type].unit;

  return (
    <div className="flex flex-col gap-4">
      <Select
        label="Listing"
        value={fields.listingId}
        onChange={(e) => onChange({ listingId: e.target.value as Id<"listings"> })}
        disabled={lockListing}
      >
        <option value="">{listings === undefined ? "Loading…" : `No ${TYPE_META[type].label.toLowerCase()} — skip this step`}</option>
        {listings?.map((l) => (
          <option key={l._id} value={l._id}>
            {l.title} — {formatMoney(l.basePriceCentavos)} / {unit}
          </option>
        ))}
        {extraOption && !listings?.some((l) => l._id === extraOption.id) && (
          <option value={extraOption.id}>{extraOption.title}</option>
        )}
      </Select>

      {isTour ? (
        <Input
          label="Tour date"
          type="date"
          min={today}
          value={fields.startDate}
          onChange={(e) => onChange({ startDate: e.target.value })}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={type === "vehicle" ? "Pickup" : "Check-in"}
            type="date"
            min={today}
            value={fields.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
          />
          <Input
            label={type === "vehicle" ? "Return" : "Check-out"}
            type="date"
            min={fields.startDate || today}
            value={fields.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
          />
        </div>
      )}

      <Input
        label={isTour ? "Guests" : "Guest count"}
        type="number"
        min={1}
        max={selectedListing?.maxGuests}
        value={fields.guestCount}
        onChange={(e) => onChange({ guestCount: Number(e.target.value) })}
      />
    </div>
  );
}

function PaymentFields({
  amount,
  onAmountChange,
  method,
  onMethodChange,
  transactionRef,
  onTransactionRefChange,
}: {
  amount: string;
  onAmountChange: (v: string) => void;
  method: PaymentMethod;
  onMethodChange: (v: PaymentMethod) => void;
  transactionRef: string;
  onTransactionRefChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Payment method" value={method} onChange={(e) => onMethodChange(e.target.value as PaymentMethod)}>
          <option value="cash">Cash</option>
          <option value="gcash">GCash</option>
          <option value="bank_transfer">Bank transfer</option>
        </Select>
        <Input
          label="Amount received (₱)"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          required
        />
      </div>
      {method !== "cash" && (
        <Input
          label={method === "gcash" ? "GCash reference number" : "Bank transfer reference number"}
          hint="Optional, but saves time reconciling against the statement later."
          value={transactionRef}
          onChange={(e) => onTransactionRefChange(e.target.value)}
        />
      )}
    </div>
  );
}

// A single line shows just the total; once a second item (vehicle, tour) is
// added alongside it, break out the itemized list so staff can see what's
// included before confirming. A dedicated review step (alwaysItemized) shows
// the itemized list even for one item, since reviewing is the point of it.
function LineItemsSummary({
  lineItems,
  grandTotal,
  alwaysItemized,
}: {
  lineItems: LineItem[];
  grandTotal: number;
  alwaysItemized?: boolean;
}) {
  if (lineItems.length === 0) return null;
  if (lineItems.length === 1 && !alwaysItemized) {
    return (
      <p className="rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-700">
        Estimated total: <span className="font-semibold text-ink-900">{formatMoney(grandTotal)}</span>
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {lineItems.map((li) => (
        <div key={li.type} className="flex items-center justify-between rounded-xl border border-ink-100 p-3 text-sm">
          <div>
            <p className="flex items-center gap-2 font-medium text-ink-900">
              <Icon name={TYPE_META[li.type].icon} /> {li.listing.title}
            </p>
            <p className="text-ink-500">
              {li.fields.startDate} → {li.endDate} · {li.quantity} {TYPE_META[li.type].unit}
              {li.quantity === 1 ? "" : "s"}
            </p>
          </div>
          <span className="font-semibold text-ink-900">{formatMoney(li.totalCentavos)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-ink-200 pt-3 text-base font-semibold text-ink-900">
        <span>Estimated total</span>
        <span>{formatMoney(grandTotal)}</span>
      </div>
    </div>
  );
}

function CreatedBookingsSummary({ createdBookings }: { createdBookings: CreatedBooking[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">
        {createdBookings.length} reservation{createdBookings.length > 1 ? "s" : ""} created.
      </div>
      <div className="flex flex-col gap-2">
        {createdBookings.map((b) => (
          <Link
            key={b.bookingId}
            to={`/admin/reservations/${b.bookingId}`}
            className="flex items-center justify-between rounded-xl border border-ink-100 p-3 text-sm hover:bg-ink-50"
          >
            <span className="flex items-center gap-2">
              <Icon name={TYPE_META[b.type].icon} /> {TYPE_META[b.type].label}
            </span>
            <span className="font-medium text-ink-900">{b.referenceNumber}</span>
          </Link>
        ))}
      </div>
      <Link to="/admin/reservations">
        <Button variant="outline">Back to reservations</Button>
      </Link>
    </div>
  );
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

  const houseListings = useQuery(api.listings.list, { type: "house" });
  const vehicleListings = useQuery(api.listings.list, { type: "vehicle" });
  const tourListings = useQuery(api.listings.list, { type: "tour" });
  const listingsByType: Record<ListingType, ListingOption[] | undefined> = {
    house: houseListings,
    vehicle: vehicleListings,
    tour: tourListings,
  };

  const createByStaff = useMutation(api.bookings.createByStaff);
  const convertInquiry = useMutation(api.inquiries.convertToBooking);

  // Each listing type keeps its own in-progress listing/dates/guest count —
  // a customer can want a house AND a van AND a tour in one visit, and
  // switching steps to check something never wipes out what was picked
  // elsewhere; leaving a type's listing unset just means it's skipped.
  const [itemsByType, setItemsByType] = useState<Record<ListingType, ItemFields>>({
    house: emptyItemFields(),
    vehicle: emptyItemFields(),
    tour: emptyItemFields(),
  });
  function updateItem(type: ListingType, patch: Partial<ItemFields>) {
    setItemsByType((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  }

  const [step, setStep] = useState(0); // 0 house, 1 vehicle, 2 tour, 3 summary
  const [customer, setCustomer] = useState<CustomerValue | null>(null);
  const [notes, setNotes] = useState("");
  const [markPaid, setMarkPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [createdBookings, setCreatedBookings] = useState<CreatedBooking[] | null>(null);

  // Pre-fill everything from the inquiry once it loads, and lock the
  // type/listing choice since conversion is tied to that specific listing.
  useEffect(() => {
    if (!inquiry || prefilled) return;
    const inquiryType = (inquiry.listing?.type as ListingType | undefined) ?? "house";
    setItemsByType((prev) => ({
      ...prev,
      [inquiryType]: {
        listingId: inquiry.listingId,
        startDate: inquiry.startDate,
        endDate: inquiry.endDate,
        guestCount: inquiry.guestCount,
      },
    }));
    if (inquiry.customer) {
      setCustomer({ fullName: inquiry.customer.fullName, email: inquiry.customer.email, phone: inquiry.customer.phone });
    }
    setNotes(inquiry.notes ?? "");
    setPrefilled(true);
  }, [inquiry, prefilled]);

  // Pre-fill the customer from a "New reservation for this customer" link
  // (from the customer or reservation detail page) — only when not
  // converting an inquiry, which already supplies its own customer.
  useEffect(() => {
    if (!preloadedCustomer?.customer || prefilled) return;
    setCustomer({
      fullName: preloadedCustomer.customer.fullName,
      email: preloadedCustomer.customer.email,
      phone: preloadedCustomer.customer.phone,
    });
  }, [preloadedCustomer, prefilled]);

  const today = new Date().toISOString().slice(0, 10);
  const isConverting = Boolean(inquiryId);

  if (isConverting && inquiry === undefined) return <PageSpinner />;
  if (isConverting && inquiry === null) {
    return <ErrorBanner message="This inquiry could not be found." />;
  }

  // A fully-priceable line for every type whose listing + dates are filled
  // in; a type left blank (or only half-filled) just doesn't appear here.
  const lineItems: LineItem[] = STEP_TYPES.map((type) => {
    const fields = itemsByType[type];
    if (!fields.listingId) return null;
    const listing = listingsByType[type]?.find((l) => l._id === fields.listingId);
    if (!listing) return null;
    const endDate = type === "tour" ? (fields.startDate ? addOneDay(fields.startDate) : "") : fields.endDate;
    if (!fields.startDate || !endDate || endDate <= fields.startDate) return null;
    const quantity =
      type === "tour" ? fields.guestCount : Math.round((new Date(endDate).getTime() - new Date(fields.startDate).getTime()) / 86400000);
    if (quantity <= 0) return null;
    return { type, listing, fields, endDate, quantity, totalCentavos: listing.basePriceCentavos * quantity };
  }).filter((item): item is LineItem => item !== null);

  const grandTotal = lineItems.reduce((sum, li) => sum + li.totalCentavos, 0);
  const singleLineItem = lineItems.length === 1 ? lineItems[0] : null;
  // Falls back to the computed estimate until the staff member overrides it —
  // only offered when exactly one item is being booked, since a payment
  // record always belongs to one specific booking.
  const resolvedPaymentAmount = paymentAmount || (singleLineItem ? (singleLineItem.totalCentavos / 100).toFixed(2) : "");

  async function handleConvertSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inquiryId || !inquiry) return;
    const inquiryType = (inquiry.listing?.type as ListingType | undefined) ?? "house";
    const inquiryFields = itemsByType[inquiryType];
    setError(null);
    if (!inquiryFields.listingId) {
      setError("Please select a listing.");
      return;
    }
    if (!inquiryFields.startDate || (inquiryType !== "tour" && !inquiryFields.endDate)) {
      setError("Please select dates.");
      return;
    }
    if (!customer || !customer.fullName.trim() || !customer.email.trim() || !customer.phone.trim()) {
      setError("Please search for or add a customer.");
      return;
    }
    // Any extra type (vehicle/tour) the staff started filling in but didn't
    // finish — block instead of silently dropping it.
    for (const type of STEP_TYPES) {
      if (type === inquiryType) continue;
      const fields = itemsByType[type];
      if (fields.listingId && !lineItems.some((li) => li.type === type)) {
        setError(`The ${TYPE_META[type].label} you added has a listing picked but no valid dates — finish it or clear the listing to skip it.`);
        return;
      }
    }
    if (markPaid && (!resolvedPaymentAmount || Number(resolvedPaymentAmount) <= 0)) {
      setError("Please enter the amount received.");
      return;
    }

    const endDate = inquiryType === "tour" ? addOneDay(inquiryFields.startDate) : inquiryFields.endDate;
    setSubmitting(true);
    const created: CreatedBooking[] = [];
    try {
      const initialPayment =
        markPaid && singleLineItem
          ? {
              amountCentavos: Math.round(Number(resolvedPaymentAmount) * 100),
              method: paymentMethod,
              transactionRef: paymentMethod !== "cash" ? transactionRef.trim() || undefined : undefined,
            }
          : undefined;
      const convertResult = await convertInquiry({
        inquiryId,
        startDate: inquiryFields.startDate,
        endDate,
        guestCount: inquiryFields.guestCount,
        customer,
        customerNotes: notes.trim() || undefined,
        initialPayment,
      });
      created.push({ type: inquiryType, referenceNumber: convertResult.referenceNumber, bookingId: convertResult.bookingId });

      // Anything else the staff added (e.g. a car for the same trip) becomes
      // its own separate booking, same as the "New reservation" wizard.
      for (const li of lineItems) {
        if (li.type === inquiryType) continue;
        const result = await createByStaff({
          listingId: li.listing._id,
          startDate: li.fields.startDate,
          endDate: li.endDate,
          guestCount: li.fields.guestCount,
          customer,
          customerNotes: notes.trim() || undefined,
        });
        created.push({ type: li.type, referenceNumber: result.referenceNumber, bookingId: result.bookingId });
      }

      if (created.length === 1) {
        navigate(`/admin/reservations/${created[0].bookingId}`);
      } else {
        setCreatedBookings(created);
      }
    } catch (err) {
      setError(
        created.length > 0
          ? `Created ${created.length} reservation${created.length > 1 ? "s" : ""} before this failed: ${getErrorMessage(err, "something went wrong")}`
          : getErrorMessage(err),
      );
      if (created.length > 0) setCreatedBookings(created);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAll() {
    setError(null);
    if (!customer || !customer.fullName.trim() || !customer.email.trim() || !customer.phone.trim()) {
      setError("Please add the customer's details in step 1.");
      setStep(0);
      return;
    }
    for (const type of STEP_TYPES) {
      const fields = itemsByType[type];
      if (fields.listingId && !lineItems.some((li) => li.type === type)) {
        setError(`The ${TYPE_META[type].label} step has a listing picked but no valid dates — finish it or clear the listing to skip it.`);
        setStep(STEP_TYPES.indexOf(type));
        return;
      }
    }
    if (lineItems.length === 0) {
      setError("Select at least one house, vehicle, or tour before creating a reservation.");
      return;
    }
    if (markPaid && (!resolvedPaymentAmount || Number(resolvedPaymentAmount) <= 0)) {
      setError("Please enter the amount received.");
      return;
    }

    setSubmitting(true);
    const created: { type: ListingType; referenceNumber: string; bookingId: Id<"bookings"> }[] = [];
    try {
      for (const li of lineItems) {
        const initialPayment =
          markPaid && singleLineItem
            ? {
                amountCentavos: Math.round(Number(resolvedPaymentAmount) * 100),
                method: paymentMethod,
                transactionRef: paymentMethod !== "cash" ? transactionRef.trim() || undefined : undefined,
              }
            : undefined;
        const result = await createByStaff({
          listingId: li.listing._id,
          startDate: li.fields.startDate,
          endDate: li.endDate,
          guestCount: li.fields.guestCount,
          customer,
          customerNotes: notes.trim() || undefined,
          initialPayment,
        });
        created.push({ type: li.type, referenceNumber: result.referenceNumber, bookingId: result.bookingId });
      }
      setCreatedBookings(created);
    } catch (err) {
      setError(
        created.length > 0
          ? `Created ${created.length} of ${lineItems.length} reservations before this failed: ${getErrorMessage(err, "something went wrong")}`
          : getErrorMessage(err),
      );
      if (created.length > 0) setCreatedBookings(created);
    } finally {
      setSubmitting(false);
    }
  }

  if (isConverting) {
    const inquiryType = (inquiry!.listing?.type as ListingType | undefined) ?? "house";
    const otherTypes = STEP_TYPES.filter((t) => t !== inquiryType);

    if (createdBookings) {
      return (
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-6 text-xl font-semibold text-ink-900">Reservations created</h1>
          <CreatedBookingsSummary createdBookings={createdBookings} />
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-xl font-semibold text-ink-900">Convert inquiry to booking</h1>
        <p className="mb-6 text-sm text-ink-500">Confirm the details below with the guest, then create the booking.</p>

        <form onSubmit={handleConvertSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <Icon name={TYPE_META[inquiryType].icon} /> {TYPE_META[inquiryType].label} inquiry
          </div>

          <ListingFieldsEditor
            type={inquiryType}
            fields={itemsByType[inquiryType]}
            onChange={(patch) => updateItem(inquiryType, patch)}
            listings={listingsByType[inquiryType]}
            today={today}
            lockListing
            extraOption={inquiry!.listing ? { id: inquiry!.listingId, title: inquiry!.listing.title } : null}
          />

          <div className="border-t border-ink-100 pt-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Add anything else for this customer?</h2>
            <p className="-mt-2 mb-3 text-xs text-ink-500">
              E.g. they also want a car for the same trip — each becomes its own reservation.
            </p>
            <div className="flex flex-col gap-5">
              {otherTypes.map((type) => (
                <div key={type}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-700">
                    <Icon name={TYPE_META[type].icon} /> {TYPE_META[type].label} (optional)
                  </h3>
                  <ListingFieldsEditor
                    type={type}
                    fields={itemsByType[type]}
                    onChange={(patch) => updateItem(type, patch)}
                    listings={listingsByType[type]}
                    today={today}
                  />
                </div>
              ))}
            </div>
          </div>

          <LineItemsSummary lineItems={lineItems} grandTotal={grandTotal} />

          <div className="border-t border-ink-100 pt-4">
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

          {singleLineItem ? (
            <div className="border-t border-ink-100 pt-4">
              <label className="flex items-center gap-2 text-sm font-medium text-ink-800">
                <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
                Record a payment now (optional — partial is fine)
              </label>
              {markPaid && (
                <div className="mt-3">
                  <PaymentFields
                    amount={resolvedPaymentAmount}
                    onAmountChange={setPaymentAmount}
                    method={paymentMethod}
                    onMethodChange={setPaymentMethod}
                    transactionRef={transactionRef}
                    onTransactionRefChange={setTransactionRef}
                  />
                </div>
              )}
              <p className="mt-2 text-xs text-ink-500">
                {markPaid
                  ? "Paying less than the total leaves the reservation \"Pending payment\" — the rest can be recorded later."
                  : "Reservation will be created as \"Pending payment\" — you can record payment later."}
              </p>
            </div>
          ) : (
            <p className="text-xs text-ink-500">
              Payments are recorded per reservation — once these are created, open each one to record what the
              customer paid.
            </p>
          )}

          {error && <ErrorBanner message={error} />}
          <Button type="submit" size="lg" isLoading={submitting}>
            {lineItems.length > 1 ? `Convert & create ${lineItems.length} reservations` : "Convert to booking"}
          </Button>
        </form>
      </div>
    );
  }

  const steps = [
    { label: "Customer & house", type: "house" as ListingType },
    { label: "Vehicle", type: "vehicle" as ListingType },
    { label: "Tour", type: "tour" as ListingType },
    { label: "Summary", type: null },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold text-ink-900">New reservation</h1>
      <p className="mb-6 text-sm text-ink-500">
        Log a booking taken over the phone, Messenger, or in person — add a house, a vehicle, a tour, or any
        combination for the same customer. Any step can be skipped.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {steps.map((s, i) => {
          const hasItem = s.type ? lineItems.some((li) => li.type === s.type) : false;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                step === i ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  step === i ? "bg-white/20" : "bg-ink-100"
                }`}
              >
                {i + 1}
              </span>
              {s.label}
              {hasItem && <Icon name="check-circle-fill" className={step === i ? "text-white" : "text-teal-600"} />}
            </button>
          );
        })}
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Customer details</h2>
            <CustomerPicker value={customer} onChange={setCustomer} />
          </div>
          <div className="border-t border-ink-100 pt-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
              <Icon name="house-door" /> House (optional)
            </h2>
            <ListingFieldsEditor
              type="house"
              fields={itemsByType.house}
              onChange={(patch) => updateItem("house", patch)}
              listings={listingsByType.house}
              today={today}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
            <Icon name="truck" /> Vehicle rental (optional)
          </h2>
          <ListingFieldsEditor
            type="vehicle"
            fields={itemsByType.vehicle}
            onChange={(patch) => updateItem("vehicle", patch)}
            listings={listingsByType.vehicle}
            today={today}
          />
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
            <Icon name="signpost-2" /> City tour (optional)
          </h2>
          <ListingFieldsEditor
            type="tour"
            fields={itemsByType.tour}
            onChange={(patch) => updateItem("tour", patch)}
            listings={listingsByType.tour}
            today={today}
          />
        </div>
      )}

      {step === 3 &&
        (createdBookings ? (
          <CreatedBookingsSummary createdBookings={createdBookings} />
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-ink-800">Summary</h2>
            {lineItems.length === 0 ? (
              <p className="text-sm text-ink-500">Nothing selected yet — go back and pick a house, vehicle, or tour.</p>
            ) : (
              <LineItemsSummary lineItems={lineItems} grandTotal={grandTotal} alwaysItemized />
            )}

            {customer && (
              <p className="text-sm text-ink-500">
                Customer: <span className="font-medium text-ink-800">{customer.fullName}</span> · {customer.email} ·{" "}
                {customer.phone}
              </p>
            )}

            <Textarea
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Booked via Messenger, requested late check-out"
            />

            {singleLineItem && (
              <div className="border-t border-ink-100 pt-4">
                <label className="flex items-center gap-2 text-sm font-medium text-ink-800">
                  <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
                  Record a payment now (optional — partial is fine)
                </label>
                {markPaid && (
                  <div className="mt-3">
                    <PaymentFields
                      amount={resolvedPaymentAmount}
                      onAmountChange={setPaymentAmount}
                      method={paymentMethod}
                      onMethodChange={setPaymentMethod}
                      transactionRef={transactionRef}
                      onTransactionRefChange={setTransactionRef}
                    />
                  </div>
                )}
              </div>
            )}
            {!singleLineItem && lineItems.length > 1 && (
              <p className="text-xs text-ink-500">
                Payments are recorded per reservation — once these are created, open each one to record what the
                customer paid.
              </p>
            )}

            {error && <ErrorBanner message={error} />}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" type="button" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="button" size="lg" isLoading={submitting} onClick={() => void handleCreateAll()}>
                Create reservation{lineItems.length > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        ))}

      {step < 3 && (
        <div className="mt-6 flex justify-between border-t border-ink-100 pt-4">
          <Button variant="ghost" type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          <Button type="button" onClick={() => setStep(step + 1)}>
            {step === 2 ? "Review & total" : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
}
