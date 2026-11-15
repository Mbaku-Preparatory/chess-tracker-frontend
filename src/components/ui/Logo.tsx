/**
 * The Chess Preparatory brand mark.
 *
 * Both variants are the generated files (tools/logo/distribute.py), shown as
 * images rather than inline SVG. Inline, the mark's ~6 KB of path data went into
 * every page twice (the HTML and the page data next to it), and once more for
 * the 404 page that Next sends along with every page. Each cached player profile is
 * stored on Vercel at a cost per 8 KB, so the header logo alone was about a
 * quarter of every profile's cache bill. As an image it is one small request
 * that the browser caches once for the whole site.
 *
 * Two variants, because the three-piece group turns to mush below ~24px:
 *   "mark" full colour, three pieces — headers and anywhere with room
 *   "tile" knight alone knocked out of a brand tile — favicon-sized contexts
 */

// public/logo.svg's viewBox is 70.06 x 64. Giving the width up front keeps the
// header from shifting when the image arrives.
const MARK_ASPECT = 70.06 / 64;

export function Logo({
  size = 36,
  variant = "mark",
  className = "",
}: {
  size?: number;
  variant?: "mark" | "tile";
  className?: string;
}) {
  const tile = variant === "tile";
  return (
    // A plain <img>: next/image would add nothing for a fixed-size SVG.
    <img
      // /icon.svg is src/app/icon.svg, the favicon, which Next serves at that path.
      src={tile ? "/icon.svg" : "/logo.svg"}
      width={tile ? size : Math.round(size * MARK_ASPECT)}
      height={size}
      className={className}
      alt="Chess Preparatory"
    />
  );
}
