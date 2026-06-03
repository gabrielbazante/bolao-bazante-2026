import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Inject pathname as a REQUEST header so RSC layouts can read it via headers().
  // (Setting it on the response instead would only reach the browser.)
  return updateSession(request, {
    "x-pathname": request.nextUrl.pathname,
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
