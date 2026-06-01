import { createAdminClient } from "@/lib/supabase/admin";

export async function notifyAllApproved(subject: string, body: string) {
  const admin = createAdminClient();
  const { data: users } = await admin.from("profiles")
    .select("email").not("approved_at", "is", null);
  // M5 will swap this for real Resend + web push. Stub for now.
  console.log("[notify]", subject, "→", users?.map(u => u.email));
}
