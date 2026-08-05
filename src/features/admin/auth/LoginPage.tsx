import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { ErrorBanner } from "../../../components/ui/Feedback";
import { Icon } from "../../../components/ui/Icon";

export function LoginPage() {
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("password", { email, password, flow: "signIn" });
      navigate("/admin");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-100 bg-white p-8 shadow-card">
        <div className="mb-6 flex items-center gap-2 text-lg font-semibold text-ink-900">
          <Icon name="building" className="text-brand-500" />
          YHWH Admin
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <ErrorBanner message={error} />}
          <Button type="submit" size="lg" isLoading={submitting} className="mt-2">
            Log in
          </Button>
        </form>
      </div>
    </div>
  );
}
