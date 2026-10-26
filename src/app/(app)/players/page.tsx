import { redirect } from "next/navigation";

/**
 * The opponent list moved to /home. This stays so existing bookmarks, the
 * mobile app's links and anything already sent in an email keep working —
 * /players/[slug] and its sub-routes are unaffected and still live here.
 */
export default function PlayersIndexRedirect() {
  redirect("/home");
}
