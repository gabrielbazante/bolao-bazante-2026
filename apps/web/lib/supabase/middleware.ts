import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session and forwards request headers to downstream RSCs.
 * Pass `extraRequestHeaders` to inject custom request headers (e.g. x-pathname)
 * that should be readable by `headers()` in server components.
 */
export async function updateSession(
  request: NextRequest,
  extraRequestHeaders?: Record<string, string>,
) {
  const reqHeaders = new Headers(request.headers);
  if (extraRequestHeaders) {
    for (const [k, v] of Object.entries(extraRequestHeaders)) {
      reqHeaders.set(k, v);
    }
  }

  let response = NextResponse.next({ request: { headers: reqHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request: { headers: reqHeaders } });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}
