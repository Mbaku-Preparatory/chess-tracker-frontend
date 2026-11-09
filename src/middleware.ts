import { NextResponse, type NextRequest } from "next/server";

import { UNKNOWN_COUNTRY, cleanCountry } from "@/lib/pricingCountry";

/**
 * /pricing shows one country's prices: the visitor's. Vercel geolocates every
 * request at its edge and sets x-vercel-ip-country (it overwrites one a client
 * sends). The page itself stays cacheable because the country goes into the
 * path it is served from, /pricing/in/KE, and the address bar still reads
 * /pricing.
 *
 * Runs on /pricing only (the matcher), so no other page pays for it.
 */
export function middleware(request: NextRequest) {
  const country = cleanCountry(request.headers.get("x-vercel-ip-country")) || UNKNOWN_COUNTRY;
  const url = request.nextUrl.clone();
  url.pathname = `/pricing/in/${country}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: "/pricing" };
