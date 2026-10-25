import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getErrorMessage } from "../../../lib/errors";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Icon } from "../../../components/ui/Icon";
import { Modal } from "../../../components/ui/Modal";
import { Input, Select, Textarea } from "../../../components/ui/Input";
import { PageSpinner, EmptyState, ErrorBanner } from "../../../components/ui/Feedback";

type ReviewStatus = "pending" | "approved" | "hidden";

const FILTERS: { value: ReviewStatus | null; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Live" },
  { value: "hidden", label: "Hidden" },
  { value: null, label: "All" },
];

const STATUS_BADGE: Record<ReviewStatus, { tone: "warning" | "success" | "neutral"; label: string }> = {
  pending: { tone: "warning", label: "Pending" },
  approved: { tone: "success", label: "Live" },
  hidden: { tone: "neutral", label: "Hidden" },
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5 text-amber-500" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name={i < rating ? "star-fill" : "star"} />
      ))}
    </span>
  );
}

export function ReviewsListPage() {
  const [status, setStatus] = useState<ReviewStatus | null>("pending");
  const reviews = useQuery(api.reviews.listForStaff, status ? { status } : {});
  const setReviewStatus = useMutation(api.reviews.setStatus);
  const removeReview = useMutation(api.reviews.remove);
  const [busyId, setBusyId] = useState<Id<"reviews"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  async function run(reviewId: Id<"reviews">, action: () => Promise<unknown>) {
    setError(null);
    setBusyId(reviewId);
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update review."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Reviews</h1>
          <p className="text-sm text-ink-500">Live reviews appear in the popups on the public site.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Icon name="plus-lg" /> Add review
        </Button>
      </div>
      {error && <ErrorBanner message={error} />}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setStatus(f.value)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
              status === f.value ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {reviews === undefined ? (
        <PageSpinner />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No reviews here"
          description={
            status === "pending"
              ? "Reviews guests submit from \"My booking\" after checkout wait here for approval."
              : "Add a review you collected from Facebook or Messenger, or approve one from a guest."
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <div key={review._id} className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars rating={review.rating} />
                  <Badge tone={STATUS_BADGE[review.status].tone}>{STATUS_BADGE[review.status].label}</Badge>
                  <Badge tone="info">{review.source === "guest" ? "From guest" : "Added by staff"}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-800">"{review.comment}"</p>
                <p className="mt-2 text-xs text-ink-500">
                  {review.guestName} · {review.listing?.title ?? "Deleted listing"}
                  {review.referenceNumber && review.bookingId && (
                    <>
                      {" · "}
                      <Link to={`/admin/reservations/${review.bookingId}`} className="text-brand-600 hover:text-brand-700">
                        {review.referenceNumber}
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {review.status !== "approved" && (
                  <Button
                    size="sm"
                    disabled={busyId === review._id}
                    onClick={() => void run(review._id, () => setReviewStatus({ reviewId: review._id, status: "approved" }))}
                  >
                    {review.status === "pending" ? "Approve" : "Show"}
                  </Button>
                )}
                {review.status !== "hidden" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === review._id}
                    onClick={() => void run(review._id, () => setReviewStatus({ reviewId: review._id, status: "hidden" }))}
                  >
                    Hide
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  disabled={busyId === review._id}
                  onClick={() => {
                    if (confirm("Delete this review permanently?")) void run(review._id, () => removeReview({ reviewId: review._id }));
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddReviewModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function AddReviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const listings = useQuery(api.listings.listAllForAdmin, open ? {} : "skip");
  const createReview = useMutation(api.reviews.createByStaff);
  const [listingId, setListingId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setListingId("");
    setGuestName("");
    setRating(5);
    setComment("");
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await createReview({ listingId: listingId as Id<"listings">, guestName, rating, comment });
      close();
    } catch (err) {
      setError(getErrorMessage(err, "Could not add review."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Add review">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select label="Listing" value={listingId} onChange={(e) => setListingId(e.target.value)} required>
          <option value="">Choose a listing…</option>
          {listings?.map((l) => (
            <option key={l._id} value={l._id}>
              {l.title}
            </option>
          ))}
        </Select>
        <Input
          label="Guest name"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          hint='Shown as first name + last initial, e.g. "Rosa T."'
          required
        />
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-700">Rating</p>
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
        </div>
        <Textarea label="Review" rows={4} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} required />
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Add review
          </Button>
        </div>
      </form>
    </Modal>
  );
}
