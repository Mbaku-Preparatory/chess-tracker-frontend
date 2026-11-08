/**
 * The chess personality test: every question, every type, and the scoring.
 * Content lives here and nowhere else, so changing a question, a description
 * or a "player like you" is an edit to this file only.
 *
 * Four sliders, five questions each. Every answer moves exactly one slider
 * toward one of its ends, so a slider's score is a count from 0 to 5 and can
 * never tie: below 3 is the left end, 3 and above the right. Four two-way
 * sliders make the 16 types.
 *
 * All of it is ours: the sliders, questions, names and descriptions were
 * written for this site, not taken from any other quiz.
 */

export type AxisKey = "pace" | "style" | "risk" | "temper";

export type Axis = {
  key: AxisKey;
  left: string;
  right: string;
  /** One letter per end, for the four-letter type code. */
  letters: [string, string];
};

export const AXES: Axis[] = [
  { key: "pace", left: "Speed", right: "Depth", letters: ["S", "D"] },
  { key: "style", left: "Attack", right: "Control", letters: ["A", "C"] },
  { key: "risk", left: "Gambler", right: "Guardian", letters: ["G", "U"] },
  { key: "temper", left: "Fire", right: "Ice", letters: ["F", "I"] },
];

const QUESTIONS_PER_AXIS = 5;

/** `end` 0 is the axis's left end, 1 its right. */
export type Answer = { text: string; end: 0 | 1 };
export type Question = { axis: AxisKey; text: string; answers: [Answer, Answer] };

export const QUESTIONS: Question[] = [
  { axis: "pace", text: "Pick your perfect chess Sunday.", answers: [
    { text: "Fifty blitz games, back to back", end: 0 },
    { text: "One long game, then hours picking it apart", end: 1 },
  ] },
  { axis: "style", text: "Your dream win ends with…", answers: [
    { text: "Your opponent resigning because every move makes it worse", end: 1 },
    { text: "A queen sacrifice, then mate on the next move", end: 0 },
  ] },
  { axis: "risk", text: "Move three. You could give up a pawn for a fast, scary attack.", answers: [
    { text: "Here, have a pawn", end: 0 },
    { text: "My pawns stay with me, thanks", end: 1 },
  ] },
  { axis: "temper", text: "You just hung your queen. Your face is…", answers: [
    { text: "Exactly the same as a second ago", end: 1 },
    { text: "Visible from space", end: 0 },
  ] },
  { axis: "pace", text: "Premoves are…", answers: [
    { text: "A lifestyle", end: 0 },
    { text: "A crime", end: 1 },
  ] },
  { axis: "style", text: "The kings have castled on opposite sides. First thing you do?", answers: [
    { text: "Push my pawns at their king. Now.", end: 0 },
    { text: "Lock the centre and see who cracks first", end: 1 },
  ] },
  { axis: "risk", text: "You're a little worse and short on time.", answers: [
    { text: "Dig in and find the most stubborn defence", end: 1 },
    { text: "Throw everything in the air and make it messy", end: 0 },
  ] },
  { axis: "temper", text: "You just won a long, hard game.", answers: [
    { text: "Loud. Very loud.", end: 0 },
    { text: "A quiet handshake, then I note down what I learned", end: 1 },
  ] },
  { axis: "pace", text: "A friend shows you a chess puzzle on their phone.", answers: [
    { text: "Hold on, I need a real board for this", end: 1 },
    { text: "Solved it before they finished the sentence", end: 0 },
  ] },
  { axis: "style", text: "You get to be one piece for a day.", answers: [
    { text: "The queen. Everywhere, all at once.", end: 0 },
    { text: "A knight on a square nobody can ever chase it from", end: 1 },
  ] },
  { axis: "risk", text: "A move might win brilliantly or lose on the spot, and you can't see to the end.", answers: [
    { text: "Play it. Life is short.", end: 0 },
    { text: "Find something I can actually calculate", end: 1 },
  ] },
  { axis: "temper", text: "Your opponent is taking forever in a completely lost position.", answers: [
    { text: "Great, more time for me to think", end: 1 },
    { text: "I start pacing the hall", end: 0 },
  ] },
  { axis: "pace", text: "How do you learn a new opening?", answers: [
    { text: "Play it online until it starts working", end: 0 },
    { text: "Study the main lines and why every move is there", end: 1 },
  ] },
  { axis: "style", text: "An endgame, one extra pawn, forty moves to go.", answers: [
    { text: "Delicious", end: 1 },
    { text: "Wake me up when something happens", end: 0 },
  ] },
  { axis: "risk", text: "Last round. A draw wins you a prize.", answers: [
    { text: "I'm playing for the win anyway", end: 0 },
    { text: "Draw, please, and pass the trophy", end: 1 },
  ] },
  { axis: "temper", text: "After a painful loss, you…", answers: [
    { text: "Need a rematch. Right now.", end: 0 },
    { text: "Go for a walk and come back fresh", end: 1 },
  ] },
  { axis: "pace", text: "Thirty seconds on your clock, and the position is a mess.", answers: [
    { text: "How did I let this happen?", end: 1 },
    { text: "My favourite moment of the game", end: 0 },
  ] },
  { axis: "style", text: "You spot a check.", answers: [
    { text: "Give it. Checks are fun.", end: 0 },
    { text: "First ask what it actually achieves", end: 1 },
  ] },
  { axis: "risk", text: "Your opening repertoire is…", answers: [
    { text: "The same trusted lines for years", end: 1 },
    { text: "Something new every week", end: 0 },
  ] },
  { axis: "temper", text: "Your chess chat energy:", answers: [
    { text: "ALL CAPS!!!", end: 0 },
    { text: "gg wp", end: 1 },
  ] },
];

/** A player whose profile the type links to. fideId and slug are FIDE's list as imported. */
export type LikePlayer = {
  /** What people call them: "Witty Alien", "Hikaru Nakamura". */
  name: string;
  /** Their name on FIDE's list, when it is not `name`. */
  fideName?: string;
  title: string;
  federation: string;
  fideId: string;
  slug: string;
};

export type PersonalityType = {
  slug: string;
  /** Four letters, one per axis in AXES order. */
  code: string;
  name: string;
  tagline: string;
  description: string;
  strengths: [string, string, string];
  kryptonite: string;
  /** The emblem's colour and piece. */
  colour: string;
  piece: string;
  player: LikePlayer;
};

export const TYPES: PersonalityType[] = [
  {
    slug: "firestarter", code: "SAGF", name: "The Firestarter", tagline: "The board is on fire, and you brought the matches.",
    description:
      "Firestarters want the board on fire by move ten. They play fast, trust their instinct and would rather lose a wild game than win a dull one. Sacrifices are a love language. Their opponents never know what is coming next, and, to be fair, neither do they. A game against a Firestarter is many things, but it is never boring.",
    strengths: ["Fearless in sharp positions", "Plays fast and makes you play fast", "Turns quiet games into chaos"],
    kryptonite: "Sometimes the fire burns the wrong king.",
    colour: "#d9480f", piece: "♞",
    player: { name: "Witty Alien", fideName: "Volen Dyulgerov", title: "CM", federation: "BUL", fideId: "2918978", slug: "volen-dyulgerov" },
  },
  {
    slug: "daredevil", code: "SAGI", name: "The Daredevil", tagline: "Huge risks, perfectly straight face.",
    description:
      "Daredevils take enormous risks without blinking. They move quickly, go straight for the king and never look nervous, even when the position is hanging by a thread. That calm is a weapon: opponents start doubting a sacrifice that might not even work. Daredevils trust their eyes, their speed and their nerve, in that order.",
    strengths: ["Ice-cold under pressure", "Spots attacking chances in a flash", "Bluffs better than anyone"],
    kryptonite: "Not every cliff comes with a safety net.",
    colour: "#c92a2a", piece: "♛",
    player: { name: "Alireza Firouzja", title: "GM", federation: "FRA", fideId: "12573981", slug: "alireza-firouzja" },
  },
  {
    slug: "thunderstorm", code: "SAUF", name: "The Thunderstorm", tagline: "Fast, loud, and built on solid ground.",
    description:
      "Thunderstorms attack with an energy you can feel from across the room, but their attacks stand on solid ground. They develop, they castle, and then the lightning starts. They play with heart and they show it, celebrating the wins and feeling the losses. When a Thunderstorm is in form, there is nowhere on the board to hide.",
    strengths: ["Attacks that are fast and sound", "Fighting spirit in every game", "Momentum: one win becomes five"],
    kryptonite: "One bad loss can rain on the next game too.",
    colour: "#e8590c", piece: "♜",
    player: { name: "Divya Deshmukh", title: "GM", federation: "IND", fideId: "35006916", slug: "divya-deshmukh" },
  },
  {
    slug: "lightning-bolt", code: "SAUI", name: "The Lightning Bolt", tagline: "The right move, before the position has finished appearing.",
    description:
      "Lightning Bolts see the right move almost before the position has appeared. They attack, but cleverly: they take what the position offers and never more than they can keep. Fast, practical and very hard to rattle, they shine brightest when the clock is running low and everyone else is starting to panic.",
    strengths: ["Lightning-fast intuition", "Practical, low-risk attacks", "At their best in time trouble"],
    kryptonite: "Long, slow positions feel like waiting for a bus.",
    colour: "#f08c00", piece: "♝",
    player: { name: "Hikaru Nakamura", title: "GM", federation: "USA", fideId: "2016192", slug: "hikaru-nakamura" },
  },
  {
    slug: "trickster", code: "SCGF", name: "The Trickster", tagline: "Every quiet move hides a little surprise.",
    description:
      "Tricksters love a trap. They steer the game into quiet-looking positions and hide a little surprise in every one of them, and when the opponent finally steps on it, everybody hears about it. They play quickly, they play for fun and they talk to the board the whole time. A game against a Trickster is a show, and the Trickster is the host.",
    strengths: ["Traps hidden in plain sight", "Quick, confident moves", "Makes chess fun to watch"],
    kryptonite: "Opponents who simply don't take the bait.",
    colour: "#9c36b5", piece: "♞",
    player: { name: "GothamChess", fideName: "Levy Rozman", title: "IM", federation: "USA", fideId: "2039877", slug: "levy-rozman" },
  },
  {
    slug: "card-shark", code: "SCGI", name: "The Card Shark", tagline: "Calm voice, quiet moves. Then the trap closes.",
    description:
      "Card Sharks look harmless. Calm voice, quiet moves, nothing to see here. They play quickly and keep the position under control, but underneath they are always quietly betting that you will reach for the wrong piece. And when you do, they are very polite about it.",
    strengths: ["Unshakeable calm", "Sneaky, well-hidden tricks", "Steady control of the position"],
    kryptonite: "Sometimes nobody falls for it.",
    colour: "#7048e8", piece: "♝",
    player: { name: "Eric Rosen", title: "IM", federation: "USA", fideId: "2032562", slug: "eric-rosen" },
  },
  {
    slug: "bulldog", code: "SCUF", name: "The Bulldog", tagline: "Grabs hold of a position and never lets go.",
    description:
      "Bulldogs grab hold of a position and never let go. They play quickly and solidly, defend as if their life depended on it and fight in every single game. They feel every result deeply, which is exactly what keeps them coming back stronger. You can beat a Bulldog, but you will be exhausted afterwards.",
    strengths: ["Tenacious defence", "Quick, solid decisions", "Never, ever gives up"],
    kryptonite: "Grinding every game burns a lot of fuel.",
    colour: "#ae3ec9", piece: "♜",
    player: { name: "Humpy Koneru", title: "GM", federation: "IND", fideId: "5008123", slug: "humpy-koneru" },
  },
  {
    slug: "metronome", code: "SCUI", name: "The Metronome", tagline: "Good move, good move, good move.",
    description:
      "Metronomes keep a steady beat that slowly wears opponents down. Good move, good move, good move. They play quickly and accurately, keep everything under control and take no risks they don't need, and they never look worried. An error from the other side is noticed instantly and punished politely.",
    strengths: ["Relentless consistency", "Fast, accurate decisions", "Squeezes wins out of equal positions"],
    kryptonite: "Some games need a spark, not a beat.",
    colour: "#5f3dc4", piece: "♚",
    player: { name: "Magnus Carlsen", title: "GM", federation: "NOR", fideId: "1503014", slug: "magnus-carlsen" },
  },
  {
    slug: "volcano", code: "DAGF", name: "The Volcano", tagline: "Quiet pressure, then an eruption.",
    description:
      "Volcanoes calculate deeply, build pressure quietly and then erupt all over the board. They will sacrifice anything for the initiative, and there is real calculation behind the fireworks. When a Volcano goes for the king, the whole room knows. Theirs are the games people still talk about years later.",
    strengths: ["Deep attacking calculation", "Fearless sacrifices", "Pure fighting energy"],
    kryptonite: "An eruption that misses leaves a lot of ash.",
    colour: "#e03131", piece: "♛",
    player: { name: "Judit Polgar", title: "GM", federation: "HUN", fideId: "700070", slug: "judit-polgar" },
  },
  {
    slug: "gambiteer", code: "DAGI", name: "The Gambiteer", tagline: "Gives up material calmly, because it's already worked out.",
    description:
      "Gambiteers give up material calmly, because they have already seen why it is worth it. They calculate deeply, attack with purpose and never panic when the position turns wild. Bold by nature, they will take on anyone, and the bigger the name across the board, the happier they are.",
    strengths: ["Fearless against anyone", "Calm in wild positions", "Sacrifices backed by calculation"],
    kryptonite: "Giving pawns away is easy; getting them back is work.",
    colour: "#d6336c", piece: "♞",
    player: { name: "Praggnanandhaa R", title: "GM", federation: "IND", fideId: "25059530", slug: "praggnanandhaa-r" },
  },
  {
    slug: "gladiator", code: "DAUF", name: "The Gladiator", tagline: "Here for a real fight, and to win it.",
    description:
      "Gladiators come to fight. They prepare carefully, build a sound position and then go after the king with everything they have. They play with passion, and it shows. Gladiators don't want a quiet draw: they want a real battle, and they want to win it.",
    strengths: ["Prepared, purposeful attacks", "Passion in every move", "At home in a fight"],
    kryptonite: "Not every game has to be a battle.",
    colour: "#c2255c", piece: "♜",
    player: { name: "Vaishali Rameshbabu", fideName: "Rameshbabu Vaishali", title: "GM", federation: "IND", fideId: "5091756", slug: "rameshbabu-vaishali" },
  },
  {
    slug: "surgeon", code: "DAUI", name: "The Surgeon", tagline: "Attacks that are rarely spectacular for long. Just correct.",
    description:
      "Surgeons attack with precision. They calculate everything, take only the risks they have measured, and stay completely calm while they do it. When a Surgeon goes for the king, it is rarely spectacular for long: it is simply correct. Their composure at the board is almost unsettling.",
    strengths: ["Precise calculation", "Total composure", "Attacks with no loose ends"],
    kryptonite: "Even surgeons need a break between operations.",
    colour: "#1971c2", piece: "♝",
    player: { name: "Gukesh D", title: "GM", federation: "IND", fideId: "46616543", slug: "gukesh-d" },
  },
  {
    slug: "alchemist", code: "DCGF", name: "The Alchemist", tagline: "Turns strange positions into gold.",
    description:
      "Alchemists turn strange positions into gold. They love imbalances: bishops against knights, pawns against an exchange, kings marching up the board. They calculate deeply and take bold, creative risks in quiet positions where nobody else sees any chances at all. Playing an Alchemist means playing chess you have never seen before.",
    strengths: ["Creative with imbalances", "Finds chances in quiet positions", "Plays for a win every game"],
    kryptonite: "Some experiments blow up the lab.",
    colour: "#0c8599", piece: "♝",
    player: { name: "Arjun Erigaisi", fideName: "Erigaisi Arjun", title: "GM", federation: "IND", fideId: "35009192", slug: "erigaisi-arjun" },
  },
  {
    slug: "puppeteer", code: "DCGI", name: "The Puppeteer", tagline: "Pulls strings you can't see.",
    description:
      "Puppeteers pull strings you can't see. They calculate deeply, keep control of the position and calmly steer opponents into choices that look natural and turn out to be fatal. They are happy to gamble, but only once they have worked out exactly how you will react. By the time you notice the strings, it is too late.",
    strengths: ["Deep, patient planning", "Steers opponents into mistakes", "Calm, calculated risks"],
    kryptonite: "Over-thinking a simple position.",
    colour: "#1864ab", piece: "♚",
    player: { name: "Javokhir Sindarov", title: "GM", federation: "UZB", fideId: "14205483", slug: "javokhir-sindarov" },
  },
  {
    slug: "iron-wall", code: "DCUF", name: "The Iron Wall", tagline: "You will have to earn every half point.",
    description:
      "Iron Walls are very, very hard to beat. They prepare thoroughly, keep their position solid and defend with real pride. Underneath the calm structure is a fierce competitor who hates losing more than anything. They might not win every game, but you will have to earn every half point against them.",
    strengths: ["Rock-solid preparation", "Excellent defence", "Very hard to beat"],
    kryptonite: "A wall on its own doesn't win the war.",
    colour: "#2b8a3e", piece: "♜",
    player: { name: "Anish Giri", title: "GM", federation: "NED", fideId: "24116068", slug: "anish-giri" },
  },
  {
    slug: "architect", code: "DCUI", name: "The Architect", tagline: "Designs the game before playing it.",
    description:
      "Architects design their games before they play them. Deep preparation, careful plans, every piece on its square. They take only the risks the blueprint allows and stay calm whatever happens. Opponents feel squeezed without quite knowing why. That is the Architect, quietly adding another floor.",
    strengths: ["Deep preparation", "Long-term planning", "Calm, accurate play"],
    kryptonite: "Plans meet opponents who never read them.",
    colour: "#087f5b", piece: "♚",
    player: { name: "Fabiano Caruana", title: "GM", federation: "USA", fideId: "2020009", slug: "fabiano-caruana" },
  },
];

/** "a Surgeon", "an Alchemist": the type's name after "is". */
export function aName(type: PersonalityType): string {
  const bare = type.name.replace(/^The /, "");
  return `${/^[AEIOU]/.test(bare) ? "an" : "a"} ${bare}`;
}

export const BY_SLUG = new Map(TYPES.map((t) => [t.slug, t]));
const BY_CODE = new Map(TYPES.map((t) => [t.code, t]));

/** Per axis, in AXES order: how many of its five answers went to the right end. */
export type Scores = [number, number, number, number];

/** Scores for a full set of answers: `picks[i]` is the index of the answer chosen for QUESTIONS[i]. */
export function scoreAnswers(picks: number[]): Scores {
  const scores: Scores = [0, 0, 0, 0];
  QUESTIONS.forEach((q, i) => {
    const answer = q.answers[picks[i]];
    if (answer?.end === 1) scores[AXES.findIndex((a) => a.key === q.axis)] += 1;
  });
  return scores;
}

export function typeFor(scores: Scores): PersonalityType {
  const code = AXES.map((axis, i) => axis.letters[scores[i] > QUESTIONS_PER_AXIS / 2 ? 1 : 0]).join("");
  return BY_CODE.get(code)!;
}

/** "3052": the result's sliders, carried in a shared link so a friend sees the same. */
export function encodeScores(scores: Scores): string {
  return scores.join("");
}

/** The sliders a link carries, or null when it carries none or nonsense. */
export function decodeScores(value: string | null): Scores | null {
  if (!value || !/^[0-5]{4}$/.test(value)) return null;
  return value.split("").map(Number) as Scores;
}

/** Where on its slider (0 to 1, left to right) a score sits. */
export function sliderPosition(score: number): number {
  // 0..5 mapped to 5%..95%, so even an extreme answer set leaves the marker on the track.
  return 0.05 + (0.9 * score) / QUESTIONS_PER_AXIS;
}

/** The sliders a type shows when nobody's own result is in the link: a clear lean, not an extreme. */
export function typicalScores(type: PersonalityType): Scores {
  return AXES.map((axis, i) => (type.code[i] === axis.letters[1] ? 4 : 1)) as Scores;
}

export function resultPath(type: PersonalityType, scores?: Scores): string {
  return `/chess-personality/${type.slug}${scores ? `?s=${encodeScores(scores)}` : ""}`;
}

// The visitor's own last result, so a shared link can tell "you" from "your friend".
const MINE_KEY = "chess-personality:mine";

export function saveMyResult(type: PersonalityType, scores: Scores): void {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify({ slug: type.slug, s: encodeScores(scores) }));
  } catch {
    // Storage blocked: the result page still shows, it just can't say "you" on a later visit.
  }
}

export function readMyResult(): { type: PersonalityType; scores: Scores } | null {
  try {
    const raw = localStorage.getItem(MINE_KEY);
    if (!raw) return null;
    const { slug, s } = JSON.parse(raw) as { slug?: string; s?: string };
    const type = slug ? BY_SLUG.get(slug) : undefined;
    const scores = decodeScores(s ?? null);
    return type && scores && typeFor(scores) === type ? { type, scores } : null;
  } catch {
    return null;
  }
}
