import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "../../../components/ui/Button";
import { Input, Select, Textarea } from "../../../components/ui/Input";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";
import { getErrorMessage } from "../../../lib/errors";
import { PhotoManager } from "./components/PhotoManager";

type ListingType = "house" | "vehicle" | "tour";

interface FormState {
  title: string;
  description: string;
  price: string;
  maxGuests: string;
  // house
  bedrooms: string;
  bathrooms: string;
  address: string;
  amenities: string;
  checkInTime: string;
  checkOutTime: string;
  // vehicle
  vehicleType: "van" | "car" | "motorcycle";
  seats: string;
  transmission: "manual" | "automatic";
  withDriver: boolean;
  pickupLocation: string;
  features: string;
  // tour
  durationHours: string;
  minPax: string;
  meetingPoint: string;
  itinerary: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  price: "",
  maxGuests: "2",
  bedrooms: "1",
  bathrooms: "1",
  address: "",
  amenities: "wifi, aircon",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  vehicleType: "car",
  seats: "4",
  transmission: "automatic",
  withDriver: false,
  pickupLocation: "",
  features: "aircon",
  durationHours: "4",
  minPax: "2",
  meetingPoint: "",
  itinerary: "",
};

const TYPE_LABELS: Record<ListingType, string> = { house: "House", vehicle: "Vehicle", tour: "Tour" };

export function ListingFormPage() {
  const { listingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = Boolean(listingId);
  const newType = (searchParams.get("type") as ListingType | null) ?? "house";

  const existing = useQuery(api.listings.getForAdmin, listingId ? { listingId: listingId as Id<"listings"> } : "skip");
  const createListing = useMutation(api.listings.create);
  const updateListing = useMutation(api.listings.update);

  const type: ListingType = isEditing ? (existing?.type as ListingType) ?? "house" : newType;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!existing || !existing.details) return;
    const d = existing.details as Record<string, unknown>;
    setForm((f) => ({
      ...f,
      title: existing.title,
      description: existing.description,
      price: (existing.basePriceCentavos / 100).toString(),
      maxGuests: String(existing.maxGuests),
      ...(existing.type === "house"
        ? {
            bedrooms: String(d.bedrooms),
            bathrooms: String(d.bathrooms),
            address: String(d.address),
            amenities: (d.amenities as string[]).join(", "),
            checkInTime: String(d.checkInTime),
            checkOutTime: String(d.checkOutTime),
          }
        : {}),
      ...(existing.type === "vehicle"
        ? {
            vehicleType: d.vehicleType as FormState["vehicleType"],
            seats: String(d.seats),
            transmission: d.transmission as FormState["transmission"],
            withDriver: Boolean(d.withDriver),
            pickupLocation: String(d.pickupLocation),
            features: (d.features as string[]).join(", "),
          }
        : {}),
      ...(existing.type === "tour"
        ? {
            durationHours: String(d.durationHours),
            minPax: String(d.minPax),
            meetingPoint: String(d.meetingPoint),
            itinerary: String(d.itinerary ?? ""),
          }
        : {}),
    }));
  }, [existing]);

  if (isEditing && existing === undefined) return <PageSpinner />;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function splitTags(value: string) {
    return value
      .split(",")
      .map((a) => a.trim().toLowerCase().replace(/\s+/g, "_"))
      .filter(Boolean);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const basePriceCentavos = Math.round(Number(form.price) * 100);
    if (!form.title.trim() || !basePriceCentavos) {
      setError("Please fill in the listing title and price.");
      return;
    }

    setSubmitting(true);
    try {
      const houseDetails =
        type === "house"
          ? {
              bedrooms: Number(form.bedrooms),
              bathrooms: Number(form.bathrooms),
              address: form.address.trim(),
              amenities: splitTags(form.amenities),
              checkInTime: form.checkInTime,
              checkOutTime: form.checkOutTime,
            }
          : undefined;
      const vehicleDetails =
        type === "vehicle"
          ? {
              vehicleType: form.vehicleType,
              seats: Number(form.seats),
              transmission: form.transmission,
              withDriver: form.withDriver,
              pickupLocation: form.pickupLocation.trim(),
              features: splitTags(form.features),
            }
          : undefined;
      const tourDetails =
        type === "tour"
          ? {
              durationHours: Number(form.durationHours),
              minPax: Number(form.minPax),
              meetingPoint: form.meetingPoint.trim(),
              itinerary: form.itinerary.trim() || undefined,
            }
          : undefined;

      if (isEditing) {
        await updateListing({
          listingId: listingId as Id<"listings">,
          title: form.title.trim(),
          description: form.description.trim(),
          basePriceCentavos,
          maxGuests: Number(form.maxGuests),
          houseDetails,
          vehicleDetails,
          tourDetails,
        });
      } else {
        if (type === "house" && !form.address.trim()) {
          setError("Please fill in the address.");
          setSubmitting(false);
          return;
        }
        if (type === "vehicle" && !form.pickupLocation.trim()) {
          setError("Please fill in the pickup location.");
          setSubmitting(false);
          return;
        }
        if (type === "tour" && !form.meetingPoint.trim()) {
          setError("Please fill in the meeting point.");
          setSubmitting(false);
          return;
        }
        const newId = await createListing({
          type,
          title: form.title.trim(),
          description: form.description.trim(),
          basePriceCentavos,
          maxGuests: Number(form.maxGuests),
          houseDetails,
          vehicleDetails,
          tourDetails,
        });
        navigate(`/admin/listings/${newId}/edit`);
        return;
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-ink-900">
        {isEditing ? `Edit ${TYPE_LABELS[type]}` : `New ${TYPE_LABELS[type]}`}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Title" value={form.title} onChange={(e) => update("title", e.target.value)} required />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`Price ${type === "house" ? "per night" : type === "vehicle" ? "per day" : "per person"} (₱)`}
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            required
          />
          <Input
            label={type === "tour" ? "Max pax" : "Max guests"}
            type="number"
            min="1"
            value={form.maxGuests}
            onChange={(e) => update("maxGuests", e.target.value)}
            required
          />
        </div>

        {type === "house" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Bedrooms" type="number" min="0" value={form.bedrooms} onChange={(e) => update("bedrooms", e.target.value)} />
              <Input label="Bathrooms" type="number" min="0" value={form.bathrooms} onChange={(e) => update("bathrooms", e.target.value)} />
            </div>
            <Input label="Address" value={form.address} onChange={(e) => update("address", e.target.value)} required />
            <Input
              label="Amenities (comma-separated)"
              value={form.amenities}
              onChange={(e) => update("amenities", e.target.value)}
              hint="e.g. wifi, aircon, pool, parking"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Check-in time" type="time" value={form.checkInTime} onChange={(e) => update("checkInTime", e.target.value)} />
              <Input label="Check-out time" type="time" value={form.checkOutTime} onChange={(e) => update("checkOutTime", e.target.value)} />
            </div>
          </>
        )}

        {type === "vehicle" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Vehicle type" value={form.vehicleType} onChange={(e) => update("vehicleType", e.target.value as FormState["vehicleType"])}>
                <option value="car">Car</option>
                <option value="van">Van</option>
                <option value="motorcycle">Motorcycle</option>
              </Select>
              <Input label="Seats" type="number" min="1" value={form.seats} onChange={(e) => update("seats", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Transmission" value={form.transmission} onChange={(e) => update("transmission", e.target.value as FormState["transmission"])}>
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </Select>
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium text-ink-800">
                <input type="checkbox" checked={form.withDriver} onChange={(e) => update("withDriver", e.target.checked)} />
                With driver
              </label>
            </div>
            <Input label="Pickup location" value={form.pickupLocation} onChange={(e) => update("pickupLocation", e.target.value)} required />
            <Input
              label="Features (comma-separated)"
              value={form.features}
              onChange={(e) => update("features", e.target.value)}
              hint="e.g. aircon, bluetooth, dashcam"
            />
          </>
        )}

        {type === "tour" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Duration (hours)" type="number" min="1" value={form.durationHours} onChange={(e) => update("durationHours", e.target.value)} />
              <Input label="Minimum pax" type="number" min="1" value={form.minPax} onChange={(e) => update("minPax", e.target.value)} />
            </div>
            <Input label="Meeting point" value={form.meetingPoint} onChange={(e) => update("meetingPoint", e.target.value)} required />
            <Textarea
              label="Itinerary (optional)"
              value={form.itinerary}
              onChange={(e) => update("itinerary", e.target.value)}
              rows={4}
            />
          </>
        )}

        {error && <ErrorBanner message={error} />}
        <Button type="submit" size="lg" isLoading={submitting}>
          {isEditing ? "Save changes" : `Create ${TYPE_LABELS[type].toLowerCase()}`}
        </Button>
      </form>

      {isEditing && existing && (
        <div className="mt-8 border-t border-ink-100 pt-6">
          <PhotoManager listingId={existing._id} photos={existing.photos} />
        </div>
      )}
    </div>
  );
}
