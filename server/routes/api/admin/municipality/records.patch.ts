import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { z } from "zod";
import { assertAdminUser } from "../../../../lib/admin-auth";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const updateRecordSchema = z.object({
  id: z.string().uuid(),
  councillor_name: z.string().nullable().optional(),
  councillor_name_bengali: z.string().nullable().optional(),
  ward_number: z.number().int().optional(),
  contact_number: z.string().nullable().optional(),
  alternate_contact_number: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  office_address: z.string().nullable().optional(),
  pin_code: z.string().nullable().optional(),
  verification_status: z.enum(["pending", "needs_review", "approved", "rejected", "imported"]).optional(),
  warnings: z.array(z.string()).optional(),
});

export default defineEventHandler(async (event) => {
  const admin = await assertAdminUser(event);

  const body = await readBody(event).catch(() => null);
  const parsed = updateRecordSchema.safeParse(body);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return { error: "Invalid payload", details: parsed.error.issues.map((e) => e.message) };
  }

  const { id, ...updates } = parsed.data;
  const adminClient = createSupabaseAdminClient();

  const patchPayload = {
    ...updates,
    reviewed_by: admin.id,
    reviewed_at: new Date().toISOString(),
  };

  const { data, error } = await adminClient
    .from("municipality_import_records")
    .update(patchPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    setResponseStatus(event, 500);
    return { error: error.message };
  }

  return { record: data };
});
