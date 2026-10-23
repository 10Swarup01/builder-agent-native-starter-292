import { Outlet } from "react-router";

import { AdminLayout } from "@/components/layout/AdminLayout";

export function meta() {
  return [{ title: "Administration · WasteWise AI" }];
}

export default function AdminRoute() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
