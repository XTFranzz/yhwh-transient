import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "../../../components/ui/Button";
import { Input, Select, Textarea } from "../../../components/ui/Input";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";
import { Icon } from "../../../components/ui/Icon";
import { getErrorMessage } from "../../../lib/errors";
import { HOUSE_AMENITIES, VEHICLE_FEATURES, splitKnownAmenities, slugifyList, type AmenityDef } from "../../../lib/amenities";
import { PhotoManager } from "./components/PhotoManager";

// Checkbox grid for a known catalog, plus a free-text escape hatch for
// anything not in it — so staff can see exactly which words get a themed
// icon instead of guessing, but aren't blocked from adding something new
// (it just renders with a generic icon on the public side).
function AmenityPicker({
  catalog,
  selected,
  onToggle,
  otherText,
  onOtherChange,
}: {
  catalog: AmenityDef[];
  selected: string[];
  onToggle: (id: string) => void;
  otherText: string;
  onOtherChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {catalog.map((a) => (
          <label
            key={a.id}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
              selected.includes(a.id) ? "border-ink-900 bg-ink-50" : "border-ink-200"
            }`}
          >
            <input type="checkbox" checked={selected.includes(a.id)} onChange={() => onToggle(a.id)} className="shrink-0" />
            <Icon name={a.icon} className="shrink-0 text-ink-500" />
            <span className="truncate">{a.label}</span>
          </label>
        ))}
      </div>
      <Input
        label="Other (comma-separated)"
        value={otherText}
        onChange={(e) => onOtherChange(e.target.value)}
        hint="Anything not listed above still works — it just shows with a plain checkmark instead of its own icon."
      />
    </div>
  );
}

// Splits a stored id list (e.g. loaded from an existing listing) into the
// two form fields AmenityPicker edits, keyed generically since house
// amenities and vehicle features reuse the same shape under different names.
function splitAmenitiesForForm<K extends string, OK extends string>(
  ids: string[],
  catalog: AmenityDef[],
  knownKey: K,
  otherKey: OK,
): Record<K, string[]> & Record<OK, string> {
  const { known, otherText } = splitKnownAmenities(ids, catalog);
  return { [knownKey]: known, [otherKey]: otherText } as Record<K, string[]> & Record<OK, string>;
}

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
  amenitiesKnown: string[];
  amenitiesOther: string;
  checkInTime: string;
  checkOutTime: string;
  // vehicle
  vehicleType: "van" | "car" | "motorcycle";
  seats: string;
  transmission: "manual" | "automatic";
  withDriver: boolean;
  plateNumber: string;
  featuresKnown: string[];
  featuresOther: string;
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
  amenitiesKnown: ["wifi", "aircon"],
  amenitiesOther: "",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  vehicleType: "car",
  seats: "4",
  transmission: "automatic",
  withDriver: false,
  plateNumber: "",
  featuresKnown: ["aircon"],
  featuresOther: "",
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
  const generateUploadUrl = useMutation(api.listings.generatePhotoUploadUrl);
  const addPhoto = useMutation(api.listings.addPhoto);

  const type: ListingType = isEditing ? (existing?.type as ListingType) ?? "house" : newType;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Photos picked before the listing exists yet — uploaded right after
  // creation succeeds, so a brand-new listing never has to go photo-less.
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; previewUrl: string }[]>([]);

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
            ...splitAmenitiesForForm(d.amenities as string[], HOUSE_AMENITIES, "amenitiesKnown", "amenitiesOther"),
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
            plateNumber: String(d.plateNumber ?? ""),
            ...splitAmenitiesForForm(d.features as string[], VEHICLE_FEATURES, "featuresKnown", "featuresOther"),
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

  function addPendingPhotos(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setPendingPhotos((p) => [...p, ...next]);
  }

  function removePendingPhoto(index: number) {
    setPendingPhotos((p) => {
      URL.revokeObjectURL(p[index].previewUrl);
      return p.filter((_, i) => i !== index);
    });
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
              amenities: [...form.amenitiesKnown, ...slugifyList(form.amenitiesOther)],
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
              plateNumber: form.plateNumber.trim() || undefined,
              features: [...form.featuresKnown, ...slugifyList(form.featuresOther)],
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
        if (type === "vehicle" && !form.plateNumber.trim()) {
          setError("Please fill in the plate number.");
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
        for (let i = 0; i < pendingPhotos.length; i++) {
          const uploadUrl = await generateUploadUrl();
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": pendingPhotos[i].file.type },
            body: pendingPhotos[i].file,
          });
          const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
          await addPhoto({ listingId: newId, storageId, isCover: i === 0 });
        }
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
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-800">Amenities</span>
              <AmenityPicker
                catalog={HOUSE_AMENITIES}
                selected={form.amenitiesKnown}
                onToggle={(id) =>
                  setForm((f) => ({
                    ...f,
                    amenitiesKnown: f.amenitiesKnown.includes(id)
                      ? f.amenitiesKnown.filter((a) => a !== id)
                      : [...f.amenitiesKnown, id],
                  }))
                }
                otherText={form.amenitiesOther}
                onOtherChange={(value) => update("amenitiesOther", value)}
              />
            </div>
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
            <Input
              label="Plate number"
              value={form.plateNumber}
              onChange={(e) => update("plateNumber", e.target.value.toUpperCase())}
              placeholder="e.g. ABC 1234"
              required
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-800">Features</span>
              <AmenityPicker
                catalog={VEHICLE_FEATURES}
                selected={form.featuresKnown}
                onToggle={(id) =>
                  setForm((f) => ({
                    ...f,
                    featuresKnown: f.featuresKnown.includes(id)
                      ? f.featuresKnown.filter((x) => x !== id)
                      : [...f.featuresKnown, id],
                  }))
                }
                otherText={form.featuresOther}
                onOtherChange={(value) => update("featuresOther", value)}
              />
            </div>
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

        {!isEditing && (
          <div className="flex flex-col gap-3 border-t border-ink-100 pt-4">
            <p className="text-sm font-medium text-ink-800">Photos</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {pendingPhotos.map((p, i) => (
                <div key={p.previewUrl} className="group relative aspect-square overflow-hidden rounded-xl bg-ink-100">
                  <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-ink-700">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePendingPhoto(i)}
                    className="absolute right-1 top-1 hidden rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-red-600 group-hover:block"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink-300 text-xs text-ink-500 hover:bg-ink-50">
                + Add photo
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addPendingPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-ink-400">
              Uploaded as soon as you create the listing below — add as many as you like.
            </p>
          </div>
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
