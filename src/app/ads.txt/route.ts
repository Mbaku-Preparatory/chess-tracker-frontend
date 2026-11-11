import { ADSENSE_CLIENT } from "@/lib/ads";

export const dynamic = "force-static";

/**
 * /ads.txt: declares Google as the only seller of this site's ad space, so
 * AdSense can verify the site and buyers trust its inventory. Advertisers pay
 * less, or nothing, for a site without one. The line is
 * "<ad system>, <publisher ID without "ca-">, DIRECT, <Google's certification ID>".
 */
export function GET() {
  const publisherId = ADSENSE_CLIENT.replace(/^ca-/, "");
  return new Response(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
