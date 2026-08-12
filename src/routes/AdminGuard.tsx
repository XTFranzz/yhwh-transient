import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PageSpinner } from "../components/ui/Feedback";

type StaffRole = "staff" | "admin" | "superadmin";

export function AdminGuard({ roles, children }: { roles?: StaffRole[]; children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const profile = useQuery(api.staff.me, isAuthenticated ? {} : "skip");

  if (isLoading || (isAuthenticated && profile === undefined)) return <PageSpinner />;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (!profile || !profile.isActive) return <Navigate to="/admin/login" replace />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/admin" replace />;

  return <>{children}</>;
}
