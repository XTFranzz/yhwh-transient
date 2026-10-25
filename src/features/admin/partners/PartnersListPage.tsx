import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getErrorMessage } from "../../../lib/errors";
import { Badge } from "../../../components/ui/Badge";
import { Icon } from "../../../components/ui/Icon";
import { PageSpinner, EmptyState, ErrorBanner } from "../../../components/ui/Feedback";

type ApplicationStatus = "new" | "contacted" | "approved" | "declined";

const FILTERS: { value: ApplicationStatus | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

const STATUS_BADGE: Record<ApplicationStatus, { tone: "warning" | "info" | "success" | "danger"; label: string }> = {
  new: { tone: "warning", label: "New" },
  contacted: { tone: "info", label: "Contacted" },
  approved: { tone: "success", label: "Approved" },
  declined: { tone: "danger", label: "Declined" },
};

const OFFERING: Record<string, { icon: string; label: string }> = {
  house: { icon: "house-door", label: "House" },
  vehicle: { icon: "truck", label: "Vehicle" },
  tour: { icon: "signpost-2", label: "Tour" },
  other: { icon: "three-dots", label: "Other" },
};

export function PartnersListPage() {
  const [status, setStatus] = useState<ApplicationStatus | null>(null);
  const applications = useQuery(api.partners.listForStaff, status ? { status } : {});
  const updateStatus = useMutation(api.partners.updateStatus);
  const [busyId, setBusyId] = useState<Id<"partnerApplications"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdateStatus(applicationId: Id<"partnerApplications">, next: ApplicationStatus) {
    setError(null);
    setBusyId(applicationId);
    try {
      await updateStatus({ applicationId, status: next });
    } catch (err) {
      setError(getErrorMessage(err, "Could not update application."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Partner applications</h1>
        <p className="text-sm text-ink-500">From the "Be a Partner" page on the public site.</p>
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

      {applications === undefined ? (
        <PageSpinner />
      ) : applications.length === 0 ? (
        <EmptyState title="No applications found" description="New partner applications will show up here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Offering</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {applications.map((app) => (
                <tr key={app._id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{app.fullName}</p>
                    <p className="text-xs text-ink-400">
                      <a href={`mailto:${app.email}`} className="hover:text-ink-700">
                        {app.email}
                      </a>{" "}
                      ·{" "}
                      <a href={`tel:${app.phone}`} className="hover:text-ink-700">
                        {app.phone}
                      </a>
                    </p>
                    {app.message && <p className="mt-1 max-w-xs whitespace-pre-line text-xs text-ink-500">"{app.message}"</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Icon name={OFFERING[app.offering].icon} className="text-ink-400" />
                      {OFFERING[app.offering].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">{app.location}</td>
                  <td className="px-4 py-3 text-ink-500">{new Date(app._creationTime).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_BADGE[app.status].tone}>{STATUS_BADGE[app.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {app.status === "new" && (
                        <button
                          disabled={busyId === app._id}
                          onClick={() => void handleUpdateStatus(app._id, "contacted")}
                          className="text-xs font-medium text-ink-500 hover:text-ink-800"
                        >
                          Mark contacted
                        </button>
                      )}
                      {(app.status === "new" || app.status === "contacted") && (
                        <>
                          <button
                            disabled={busyId === app._id}
                            onClick={() => void handleUpdateStatus(app._id, "declined")}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Decline
                          </button>
                          <button
                            disabled={busyId === app._id}
                            onClick={() => void handleUpdateStatus(app._id, "approved")}
                            className="text-xs font-medium text-teal-700 hover:text-teal-900"
                          >
                            Approve
                          </button>
                        </>
                      )}
                    </div>
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
