import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatDate, formatStatus } from "../../../lib/format";
import { Button } from "../../../components/ui/Button";
import { Badge, StatusBadge } from "../../../components/ui/Badge";
import { Icon } from "../../../components/ui/Icon";
import { PageSpinner, EmptyState, ErrorBanner } from "../../../components/ui/Feedback";

const FILTERS = [
  { value: null, label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "declined", label: "Declined" },
];

const TYPE_ICON: Record<string, string> = { house: "house-door", vehicle: "truck", tour: "signpost-2" };

export function InquiriesListPage() {
  const [status, setStatus] = useState<string | null>(null);
  const inquiries = useQuery(api.inquiries.listForStaff, status ? { status: status as never } : {});
  const updateStatus = useMutation(api.inquiries.updateStatus);
  const [busyId, setBusyId] = useState<Id<"inquiries"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdateStatus(inquiryId: Id<"inquiries">, next: "contacted" | "declined") {
    setError(null);
    setBusyId(inquiryId);
    try {
      await updateStatus({ inquiryId, status: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update inquiry.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">Inquiries</h1>
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

      {inquiries === undefined ? (
        <PageSpinner />
      ) : inquiries.length === 0 ? (
        <EmptyState title="No inquiries found" description="New inquiries from the public site will show up here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Guests</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {inquiries.map((inq) => (
                <tr key={inq._id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{inq.customer?.fullName ?? "—"}</p>
                    <p className="text-xs text-ink-400">
                      {inq.customer?.email} · {inq.customer?.phone}
                    </p>
                    {inq.notes && <p className="mt-1 max-w-xs text-xs text-ink-500">"{inq.notes}"</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Icon name={inq.listing ? TYPE_ICON[inq.listing.type] : "question-circle"} className="text-ink-400" />
                      {inq.listing?.title ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(inq.startDate)} → {formatDate(inq.endDate)}
                  </td>
                  <td className="px-4 py-3">{inq.guestCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={inq.status} label={formatStatus(inq.status)} />
                      {inq.isAvailable === false && <Badge tone="warning">Dates conflict</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(inq.status === "new" || inq.status === "contacted") && (
                      <div className="flex justify-end gap-2">
                        {inq.status === "new" && (
                          <button
                            disabled={busyId === inq._id}
                            onClick={() => void handleUpdateStatus(inq._id, "contacted")}
                            className="text-xs font-medium text-ink-500 hover:text-ink-800"
                          >
                            Mark contacted
                          </button>
                        )}
                        <button
                          disabled={busyId === inq._id}
                          onClick={() => void handleUpdateStatus(inq._id, "declined")}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          Decline
                        </button>
                        <Link to={`/admin/reservations/new?inquiryId=${inq._id}`}>
                          <Button size="sm">Convert to booking</Button>
                        </Link>
                      </div>
                    )}
                    {inq.status === "converted" && inq.convertedBookingId && (
                      <Link
                        to={`/admin/reservations/${inq.convertedBookingId}`}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        View booking
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
