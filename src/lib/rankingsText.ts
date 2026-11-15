/**
 * The rankings page's heading and description. The English is also the page's
 * title and meta description, so it is built exactly as before; other
 * languages get plainer sentences from translatable templates (word order
 * and agreement differ too much to glue phrases together).
 */
import { federationFor, federationName } from "@/lib/federations";
import { msg, type Vars } from "@/lib/i18n";
import { LISTS, TIME_CONTROLS, type RankingsView } from "@/lib/rankings";

export const JUNIORS_BORN_FROM = new Date().getUTCFullYear() - 20;

type Translate = (text: string, vars?: Vars) => string;

export function heading(view: RankingsView): string {
  const scope = view.fed ? federationFor(view.fed).name : "World";
  const list = LISTS.find((l) => l.key === view.list)!.phrase;
  return [scope, list, view.tc, "chess rankings"].filter(Boolean).join(" ");
}

export function describe(view: RankingsView, count?: number): string {
  const who = {
    overall: "active players",
    women: "active women players",
    juniors: `active juniors (born ${JUNIORS_BORN_FROM} or later)`,
    girls: `active girls (born ${JUNIORS_BORN_FROM} or later)`,
  }[view.list];
  const where = view.fed ? ` in ${federationFor(view.fed).name}` : "";
  const total = count ? `${count.toLocaleString("en")} ` : "";
  return `FIDE's official ${view.tc} ranking of ${total}${who}${where}, from the latest monthly rating list. Tied ratings share a place.`;
}

export function translatedHeading(view: RankingsView, locale: string, t: Translate): string {
  return t(msg("{tc} chess rankings: {list}, {scope}"), {
    tc: t(TIME_CONTROLS.find((c) => c.key === view.tc)!.label),
    list: t(LISTS.find((l) => l.key === view.list)!.label),
    scope: view.fed ? federationName(federationFor(view.fed), locale) : t(msg("World")),
  });
}

export function translatedDescribe(view: RankingsView, t: Translate, count?: number): string {
  const parts = [t(msg("FIDE's official ranking, from the latest monthly rating list. Tied ratings share a place."))];
  if (count) parts.push(t(msg("Players: {count}."), { count: count.toLocaleString("en") }));
  if (view.list === "juniors" || view.list === "girls") parts.push(t(msg("Born {year} or later."), { year: JUNIORS_BORN_FROM }));
  return parts.join(" ");
}
