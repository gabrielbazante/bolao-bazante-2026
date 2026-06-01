import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export async function notifyAllApproved(title: string, body: string, url = "/") {
  const admin = createAdminClient();
  const { data: users } = await admin.from("profiles")
    .select("push_subscription").not("approved_at", "is", null)
    .not("push_subscription", "is", null);
  for (const u of users ?? []) {
    try {
      await webpush.sendNotification(
        u.push_subscription as any,
        JSON.stringify({ title, body, url }),
      );
    } catch (e) {
      console.error("push failed", e);
    }
  }
}
