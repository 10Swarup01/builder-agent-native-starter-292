/*
# Restrict AI photo analysis attempt writes to the server

1. Security
- Removes the owner INSERT policy on `report_photo_analyses` and revokes INSERT from `authenticated`.
- Signed-in users keep owner-only SELECT on their own attempt rows. No update or delete.
- The analysis route writes attempt rows with a server-only service-role client after Gemini returns a validated result.

2. Notes
- Forward-only and idempotent. `report_photo_analyses` rows, `report_ai_analyses`, `reports`, `report_images`, their policies and grants, and `submit_waste_report` are not changed.
*/

DROP POLICY IF EXISTS "insert_own_photo_analyses" ON public.report_photo_analyses;

REVOKE INSERT ON public.report_photo_analyses FROM authenticated;
