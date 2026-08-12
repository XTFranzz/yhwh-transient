import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatMoney } from "../../../lib/format";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Modal } from "../../../components/ui/Modal";
import { PageSpinner, EmptyState, ErrorBanner } from "../../../components/ui/Feedback";

export function CustomersListPage() {
  const customers = useQuery(api.customers.list, {});
  const createCustomer = useMutation(api.customers.create);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (customers === undefined) return <PageSpinner />;

  const term = search.trim().toLowerCase();
  const visible = term
    ? customers.filter(
        (c) =>
          c.fullName.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.phone.toLowerCase().includes(term),
      )
    : customers;
  const sorted = [...visible].sort((a, b) => b.lifetimeCentavos - a.lifetimeCentavos);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createCustomer({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() });
      setOpen(false);
      setFullName("");
      setEmail("");
      setPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create customer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Customers</h1>
        <Button onClick={() => setOpen(true)}>+ New customer</Button>
      </div>

      <Input
        placeholder="Search by name, email, or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {sorted.length === 0 ? (
        <EmptyState
          title={term ? "No customers match your search" : "No customers yet"}
          description={term ? undefined : "Add a walk-in customer, or one will appear here after their first booking."}
        />
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
              {sorted.map((c) => (
                <tr key={c._id} className="cursor-pointer hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/customers/${c._id}`} className="block font-medium text-ink-900">
                      {c.fullName}
                    </Link>
                  </td>
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

      <Modal open={open} onClose={() => setOpen(false)} title="New customer">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          {error && <ErrorBanner message={error} />}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Create customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
