# Roadmap — Dashboard Simplification & New Features

Living notes for the ongoing UI revamp. Not a spec — just capturing decisions so they survive between sessions. Update in place as things get built or the plan changes.

- [x] **Planning captured 2026-07-24** — this doc fully reflects the discussion (two-card dashboard, Beta placeholder behavior, Phase 2 left unscoped on purpose, analytics intent). Safe to resume from this file alone next session — no need to re-read prior conversation for context.

## Why

User feedback: people don't immediately get a sense of what to do when they land in the app. The dashboard has accumulated sections over time (opponents, teams, practice, etc.) and the entry point needs to be much simpler.

## Phase 1 — Two-card dashboard (next up, not yet built)

On login, the dashboard becomes exactly two cards. Nothing else on that first screen.

1. **Prepare for Opponents / View Opponent Files** — routes into the existing opponent-scouting flow (today's `/players` dashboard: opponent list, prep summaries, opening explorer, game import, etc.). This is all already-built functionality, just re-entered through a clearer front door.
2. **Save & Review My Games** — *Beta*. Not built yet (see Phase 2). For now, clicking this card should show a "this feature will be ready soon" message — no navigation to a real page, no half-built UI.

Everything else currently on the dashboard (or reachable from it) needs to be re-homed behind one of these two cards, or reconsidered, as this phase gets implemented.

## Phase 2 — Save & Review My Games (future, not scoped yet)

A new capability: let a user save/import their **own** games (as opposed to tracking opponents) for personal review — something the app never had a distinct place for, since everything up to now has been opponent-centric (`Player` + `Game` models keyed on `created_by`, no notion of "this is me").

Open questions to resolve when we get here:
- Data model: extend `Player`/`Game` with a "this is me" flag, or a separate model? `UserRepertoire` is the closest existing "about me" concept today.
- Reuse existing infra where possible: PGN import flow (Chess.com/Lichess/manual), PGN viewer + board, engine eval (Stockfish/Lichess cloud eval), opening tagging — all of this already exists for opponents and likely transfers directly.
- Review/study UX: is this just "my games, filterable/taggable" or does it need something more (spaced repetition, mistake-tracking, etc.)? TBD.

Not scoped beyond this — will define properly when Phase 1 is done.

## Analytics / Observability (to add, not yet integrated)

Motivated directly by the "users didn't know what to do" problem — want real behavioral data instead of guessing.

- **Mixpanel** — product analytics: funnel/drop-off tracking, event instrumentation on the new two-card flow especially.
- **Microsoft Clarity** — session replay + heatmaps, for debugging exactly where users get stuck or confused.

Neither is wired in yet. When they are: instrument the two dashboard cards first (click-through rate, which card people pick, where they drop off) since that's the thing this whole revamp is trying to fix.

## Status

- [ ] Two-card dashboard (Phase 1)
- [ ] "Coming soon" placeholder behavior for Save & Review My Games card
- [ ] Mixpanel integration
- [ ] Microsoft Clarity integration
- [ ] Save & Review My Games — full feature (Phase 2)
