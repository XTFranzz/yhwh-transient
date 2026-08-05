import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface Photo {
  id: Id<"listingPhotos">;
  url: string | null;
  isCover: boolean;
}

export function PhotoManager({ listingId, photos }: { listingId: Id<"listings">; photos: Photo[] }) {
  const generateUploadUrl = useMutation(api.listings.generatePhotoUploadUrl);
  const addPhoto = useMutation(api.listings.addPhoto);
  const removePhoto = useMutation(api.listings.removePhoto);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      await addPhoto({ listingId, storageId, isCover: photos.length === 0 });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink-800">Photos</p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-ink-100">
            {photo.url && <img src={photo.url} alt="" className="h-full w-full object-cover" />}
            {photo.isCover && (
              <span className="absolute left-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-ink-700">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => void removePhoto({ photoId: photo.id })}
              className="absolute right-1 top-1 hidden rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-red-600 group-hover:block"
            >
              Remove
            </button>
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink-300 text-xs text-ink-500 hover:bg-ink-50">
          {uploading ? "Uploading…" : "+ Add photo"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => void handleUpload(e)} disabled={uploading} />
        </label>
      </div>
      {photos.length === 0 && <p className="text-xs text-ink-400">Add at least one photo before activating this listing.</p>}
    </div>
  );
}
