import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "../../../components/ui/Button";
import { Input, Select } from "../../../components/ui/Input";
import { Modal } from "../../../components/ui/Modal";
import { Badge } from "../../../components/ui/Badge";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";

const ROLES = [
  { value: "owner_admin", label: "Owner / Admin" },
  { value: "front_desk", label: "Front desk" },
  { value: "housekeeping", label: "Housekeeping" },
];

export function StaffListPage() {
  const staff = useQuery(api.staff.listStaff);
  const createStaffAccount = useAction(api.staff.createStaffAccount);
  const setActive = useMutation(api.staff.setActive);

  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("front_desk");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (staff === undefined) return <PageSpinner />;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createStaffAccount({ displayName, email, password, role: role as "owner_admin" | "front_desk" | "housekeeping" });
      setOpen(false);
      setDisplayName("");
      setEmail("");
      setPassword("");
      setRole("front_desk");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create staff account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Staff</h1>
        <Button onClick={() => setOpen(true)}>+ New staff account</Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-ink-100 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {staff.map((s) => (
              <tr key={s._id}>
                <td className="px-4 py-3 font-medium text-ink-900">{s.displayName}</td>
                <td className="px-4 py-3 capitalize text-ink-600">{s.role.replace("_", " ")}</td>
                <td className="px-4 py-3">
                  <Badge tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => void setActive({ staffProfileId: s._id as Id<"staffProfiles">, isActive: !s.isActive })}
                    className="text-xs font-medium text-ink-500 hover:text-ink-800"
                  >
                    {s.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New staff account">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Temporary password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          {error && <ErrorBanner message={error} />}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Create account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
