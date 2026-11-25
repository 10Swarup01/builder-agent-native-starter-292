import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { getCurrentUser, type CurrentUser } from "@/services/auth";

export function meta() {
  return [{ title: "Administration · WasteWise AI" }];
}

export default function AdminRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminUser, setAdminUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<"checking" | "authorized" | "denied">("checking");

  useEffect(() => {
    let active = true;

    async function verifyAdminAccess() {
      try {
        const user = await getCurrentUser();
        if (!active) return;

        if (user.role === "admin") {
          setAdminUser(user);
          setStatus("authorized");
        } else {
          setStatus("denied");
          toast.error("This account does not have administrator access.");
          navigate("/", { replace: true });
        }
      } catch {
        if (!active) return;
        setStatus("denied");
        toast.error("Please log in with administrator credentials.");
        navigate(`/login?mode=admin&next=${encodeURIComponent(location.pathname)}`, { replace: true });
      }
    }

    void verifyAdminAccess();

    const { data: authListener } = getSupabaseBrowserClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && active) {
        setStatus("denied");
        navigate("/login?mode=admin", { replace: true });
      }
    });

    return () => {
      active = false;
      authListener?.subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying administrator authorization...</p>
        </div>
      </div>
    );
  }

  if (status !== "authorized" || !adminUser) {
    return null;
  }

  return (
    <AdminLayout adminUser={adminUser}>
      <Outlet />
    </AdminLayout>
  );
}
