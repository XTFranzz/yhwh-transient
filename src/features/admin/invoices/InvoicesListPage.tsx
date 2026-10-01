import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import { formatDate, formatMoney, formatStatus } from "../../../lib/format";
import { exportToCsv } from "../../../lib/exportCsv";
import { StatusBadge, Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { PageSpinner, EmptyState } from "../../../components/ui/Feedback";
import { Icon } from "../../../components/ui/Icon";

const TYPE_ICON: Record<string, string> = { house: "house-door", vehicle: "truck", tour: "signpost-2" };

type Invoice = FunctionReturnType<typeof api.invoices.listForAdmin>[number];

function groupByCustomer(invoices: Invoice[]) {
  const groups = new Map<string, { key: string; customer: Invoice["customer"]; items: Invoice[] }>();
  for (const inv of invoices) {
    const key = inv.customer?._id ?? "unknown";
    const existing = groups.get(key);
    if (existing) existing.items.push(inv);
    else groups.set(key, { key, customer: inv.customer, items: [inv] });
  }
  // Customers with more than one booking (a house + a vehicle, etc.) float to
  // the top — that overlap is exactly what's easy to miss in a flat list.
  return Array.from(groups.values()).sort((a, b) => b.items.length - a.items.length || b.items[0].createdAt - a.items[0].createdAt);
}

export function InvoicesListPage() {
  const invoices = useQuery(api.invoices.listForAdmin, {});
  const navigate = useNavigate();

  function handleExport() {
    if (!invoices || invoices.length === 0) return;
    exportToCsv(
      `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      invoices.map((inv) => ({
        Invoice: inv.invoiceNumber,
        Customer: inv.customer?.fullName ?? "",
        Email: inv.customer?.email ?? "",
        Phone: inv.customer?.phone ?? "",
        Listing: inv.listing?.title ?? "",
        Type: inv.listing?.type ?? "",
        "Start date": inv.startDate,
        "End date": inv.endDate,
        "Amount (PHP)": (inv.amountCentavos / 100).toFixed(2),
        "Paid (PHP)": (inv.paidCentavos / 100).toFixed(2),
        "Balance (PHP)": (inv.balanceCentavos / 100).toFixed(2),
        Status: inv.status === "estimate" ? "Estimate" : formatStatus(inv.status),
      })),
    );
  }

  const groups = invoices ? groupByCustomer(invoices) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Invoices</h1>
          <p className="mt-1 text-sm text-ink-500">
            Grouped by customer, so a guest who booked a house, a vehicle, and a tour shows up as one group instead
            of three unrelated rows.
          </p>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!invoices || invoices.length === 0}>
            <Icon name="file-earmark-spreadsheet" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Icon name="printer" /> Print
          </Button>
        </div>
      </div>

      {invoices === undefined ? (
        <PageSpinner />
      ) : invoices.length === 0 ? (
        <EmptyState title="No invoices yet" description="Invoices appear once a customer inquires or books." />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.key} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
              <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50 px-4 py-2.5">
                {group.customer ? (
                  <Link to={`/admin/customers/${group.customer._id}`} className="text-sm font-semibold text-ink-900 hover:underline">
                    {group.customer.fullName}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-ink-900">Unknown customer</span>
                )}
                <span className="text-xs text-ink-500">
                  {group.items.length} {group.items.length === 1 ? "item" : "items"}
                </span>
              </div>
              <table className="w-full min-w-[640px] text-left text-sm">
                <tbody className="divide-y divide-ink-100">
                  {group.items.map((inv) => (
                    <tr
                      key={`${inv.kind}-${inv.id}`}
                      onClick={() => navigate(`/admin/invoices/${inv.kind}/${inv.id}`)}
                      className="cursor-pointer hover:bg-ink-50"
                    >
                      <td className="px-4 py-3">
                        <span className="block font-medium text-ink-900">{inv.invoiceNumber}</span>
                        {inv.kind === "inquiry" && <span className="text-xs text-ink-400">Estimate — not yet booked</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <Icon name={inv.listing ? TYPE_ICON[inv.listing.type] : "question-circle"} className="text-ink-400" />
                          {inv.listing?.title ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(inv.startDate)} → {formatDate(inv.endDate)}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(inv.amountCentavos)}
                        {inv.status === "pending_payment" && inv.paidCentavos > 0 && (
                          <p className="text-xs text-sky-700">Down payment: {formatMoney(inv.paidCentavos)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {inv.status === "estimate" ? (
                          <Badge tone="info">Estimate</Badge>
                        ) : (
                          <StatusBadge status={inv.status} label={formatStatus(inv.status)} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
