// Shared amenity/feature catalogs — the single source of truth for which
// tags get a themed icon, used by both the admin listing form (so staff can
// pick from a checklist instead of guessing magic words) and the public
// detail pages (so the icon shown always matches what the catalog says).
// Anything staff type that isn't in a catalog still works — it just renders
// with a generic icon and a cleaned-up label instead of a raw "billiard_table"
// slug, so there's no dead end for amenities we haven't thought to add yet.

export interface AmenityDef {
  id: string;
  label: string;
  icon: string;
}

export const HOUSE_AMENITIES: AmenityDef[] = [
  { id: "wifi", label: "WiFi", icon: "wifi" },
  { id: "aircon", label: "Air conditioning", icon: "snow" },
  { id: "kitchen", label: "Kitchen", icon: "cup-hot" },
  { id: "kitchenette", label: "Kitchenette", icon: "cup-hot" },
  { id: "parking", label: "Free parking", icon: "p-square" },
  { id: "pool", label: "Private pool", icon: "water" },
  { id: "hot_shower", label: "Hot shower", icon: "droplet-half" },
  { id: "bbq_grill", label: "BBQ grill", icon: "fire" },
  { id: "tv", label: "Smart TV", icon: "tv" },
  { id: "karaoke", label: "Karaoke", icon: "mic-fill" },
  { id: "game_room", label: "Game room / billiards", icon: "controller" },
  { id: "garden", label: "Garden / outdoor space", icon: "sun" },
  { id: "security", label: "Security / CCTV", icon: "shield-check" },
  { id: "breakfast", label: "Breakfast included", icon: "egg-fried" },
];

export const VEHICLE_FEATURES: AmenityDef[] = [
  { id: "aircon", label: "Air conditioning", icon: "snow" },
  { id: "bluetooth", label: "Bluetooth", icon: "bluetooth" },
  { id: "dashcam", label: "Dashcam", icon: "camera-video" },
  { id: "gps", label: "GPS navigation", icon: "geo-alt" },
  { id: "bottled_water", label: "Bottled water", icon: "droplet" },
  { id: "helmet_included", label: "Helmet included", icon: "check-circle" },
];

function prettify(id: string): string {
  return id
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Resolves a stored id to its catalog icon/label, or a readable fallback
// (generic icon, underscores turned into a capitalized phrase) for anything
// staff typed that isn't in the catalog.
export function amenityDisplay(id: string, catalog: AmenityDef[]): { icon: string; label: string } {
  const match = catalog.find((a) => a.id === id);
  if (match) return { icon: match.icon, label: match.label };
  return { icon: "check-circle", label: prettify(id) };
}

// For loading the admin form: separates a stored id list into the ones that
// match a catalog checkbox versus everything else, rendered back as a
// readable comma-separated "other" string for that free-text field.
export function splitKnownAmenities(ids: string[], catalog: AmenityDef[]): { known: string[]; otherText: string } {
  const knownIds = new Set(catalog.map((a) => a.id));
  const known = ids.filter((id) => knownIds.has(id));
  const otherText = ids
    .filter((id) => !knownIds.has(id))
    .map(prettify)
    .join(", ");
  return { known, otherText };
}

// Turns free text like "billiard table, garden gazebo" into stored ids like
// ["billiard_table", "garden_gazebo"].
export function slugifyList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}
