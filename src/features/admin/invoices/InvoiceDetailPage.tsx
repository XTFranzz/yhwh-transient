import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDate, formatMoney, formatPaymentMethod, formatStatus } from "../../../lib/format";
import { Button } from "../../../components/ui/Button";
import { StatusBadge, Badge } from "../../../components/ui/Badge";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";
import { LogoWordmark } from "../../../components/ui/Logo";

const TYPE_LABEL: Record<string, string> = { house: "House rental", vehicle: "Vehicle rental", tour: "City tour" };

export function InvoiceDetailPage() {
  const { kind = "booking", id = "" } = useParams();
  const detail = useQuery(api.invoices.getDetail, { kind: kind as "booking" | "inquiry", id });

  if (detail === undefined) return <PageSpinner />;
  if (detail === null) return <ErrorBanner message="Invoice not found." />;

  const { invoiceNumber, customer, listing, startDate, endDate, lineItem, amountCentavos, paidCentavos, balanceCentavos, status, payments, notes, createdAt } =
    detail;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between no-print">
        <Link to="/admin/invoices" className="text-sm text-ink-500 hover:text-ink-800">
          ← Back to invoices
        </Link>
        <Button onClick={() => window.print()}>
          Print / Save PDF
        </Button>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-card print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-6 border-b border-ink-100 pb-6">
          <LogoWordmark tone="dark" />
          <div className="text-right">
            <h1 className="font-serif text-2xl font-semibold text-ink-900">Invoice</h1>
            <p className="mt-1 text-sm text-ink-500">{invoiceNumber}</p>
            <p className="text-sm text-ink-500">{formatDate(new Date(createdAt).toISOString().slice(0, 10))}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Bill to</p>
            <p className="mt-1 font-medium text-ink-900">{customer?.fullName ?? "—"}</p>
            <p className="text-ink-500">{customer?.email}</p>
            <p className="text-ink-500">{customer?.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Status</p>
            <div className="mt-1 inline-flex">
              {status === "estimate" ? (
                <Badge tone="info">Estimate — not yet booked</Badge>
              ) : (
                <StatusBadge status={status} label={formatStatus(status)} />
              )}
            </div>
            {status === "pending_payment" && paidCentavos > 0 && (
              <p className="mt-1.5 text-xs text-sky-700">Down payment received: {formatMoney(paidCentavos)}</p>
            )}
          </div>
        </div>

        <table className="mt-8 w-full text-left text-sm">
          <thead className="border-b border-ink-200 text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="pb-2">Description</th>
              <th className="pb-2 text-right">Qty</th>
              <th className="pb-2 text-right">Rate</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            <tr>
              <td className="py-3">
                <p className="font-medium text-ink-900">{listing?.title ?? "—"}</p>
                <p className="text-ink-500">
                  {listing ? TYPE_LABEL[listing.type] : ""} · {formatDate(startDate)} → {formatDate(endDate)}
                </p>
              </td>
              <td className="py-3 text-right">
                {lineItem ? `${lineItem.quantity} ${lineItem.unitLabel}${lineItem.quantity === 1 ? "" : "s"}` : "—"}
              </td>
              <td className="py-3 text-right">{lineItem ? formatMoney(lineItem.rateCentavos) : "—"}</td>
              <td className="py-3 text-right font-medium text-ink-900">{formatMoney(amountCentavos)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs text-sm">
            <div className="flex justify-between py-1">
              <span className="text-ink-500">Total</span>
              <span className="font-medium text-ink-900">{formatMoney(amountCentavos)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-ink-500">Paid</span>
              <span>{formatMoney(paidCentavos)}</span>
            </div>
            <div className="flex justify-between border-t border-ink-200 py-2">
              <span className="font-semibold text-ink-900">Balance due</span>
              <span className={`font-semibold ${balanceCentavos > 0 ? "text-amber-600" : "text-ink-900"}`}>
                {formatMoney(balanceCentavos)}
              </span>
            </div>
          </div>
        </div>

        {notes && (
          <div className="mt-6 border-t border-ink-100 pt-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Notes</p>
            <p className="mt-1 text-ink-600">{notes}</p>
          </div>
        )}

        {payments.length > 0 && (
          <div className="mt-6 border-t border-ink-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Payment history</p>
            <div className="flex flex-col gap-2 text-sm">
              {payments.map((p) => (
                <div key={p._id} className="flex items-center justify-between">
                  <span>
                    {formatMoney(p.amountCentavos)} via {formatPaymentMethod(p.method)}
                    {p.transactionRef && <span className="text-ink-400"> · Ref: {p.transactionRef}</span>}
                  </span>
                  <StatusBadge status={p.status} label={formatStatus(p.status)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "estimate" && (
          <p className="mt-6 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This is an estimate generated from an open inquiry — amounts may change once staff confirms dates and
            converts it to a reservation.
          </p>
        )}
      </div>
    </div>
  );
}
