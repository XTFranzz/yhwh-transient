import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatMoney } from "../../../lib/format";
import { PageSpinner, EmptyState } from "../../../components/ui/Feedback";

export function CustomersListPage() {
  const bookings = useQuery(api.bookings.listForAdmin, {});

  if (bookings === undefined) return <PageSpinner />;

  const byGuest = new Map<
    string,
    { fullName: string; email: string; phone: string; bookingCount: number; lifetimeCentavos: number }
  >();
  for (const b of bookings) {
    if (!b.guest) continue;
    const key = b.guest._id;
    const entry = byGuest.get(key) ?? {
      fullName: b.guest.fullName,
      email: b.guest.email,
      phone: b.guest.phone,
      bookingCount: 0,
      lifetimeCentavos: 0,
    };
    entry.bookingCount += 1;
    if (b.status !== "cancelled" && b.status !== "no_show") entry.lifetimeCentavos += b.totalCentavos;
    byGuest.set(key, entry);
  }
  const customers = Array.from(byGuest.values()).sort((a, b) => b.lifetimeCentavos - a.lifetimeCentavos);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">Customers</h1>

      {customers.length === 0 ? (
        <EmptyState title="No customers yet" description="Guests appear here once they make a booking." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Lifetime value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {customers.map((c) => (
                <tr key={c.email + c.phone}>
                  <td className="px-4 py-3 font-medium text-ink-900">{c.fullName}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {c.email}
                    <br />
                    {c.phone}
                  </td>
                  <td className="px-4 py-3">{c.bookingCount}</td>
                  <td className="px-4 py-3">{formatMoney(c.lifetimeCentavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
