// SAMPLE DATA: invented brand, faces, rates and scores for the demo; replaced by the API in DATA_MODE=app.
// The eight picks of the sample plan. sourceRef values point at step ids in run-sample.ts.
import type { CopyLine, Evidence, GuardVerdict, Pick } from "@/contract";

const pass: GuardVerdict = { status: "pass", engine: "live-guard", reasons: [], suggestion: null };

const line = (text: string, rationale: string, guard: GuardVerdict = pass): CopyLine => ({ text, rationale, guard, nemo: null });

const heat = (value: number): Evidence => ({ kind: "qloo-heatmap", label: "audience affinity in this cell", value, sourceRef: "step-05" });
const tag = (label: string, value: number): Evidence => ({ kind: "qloo-tag", label: `over-indexes on ${label}`, value, sourceRef: "step-13" });
const brand = (value: number): Evidence => ({ kind: "qloo-brand", label: "fans' favourite brands over-index here", value, sourceRef: "step-14" });
const photo = (label: string, value: number, step: string): Evidence => ({ kind: "photo-read", label, value, sourceRef: step });
const event = (label: string, step: string): Evidence => ({ kind: "tavily-event", label, value: null, sourceRef: step });

const ok = { status: "ok" as const, note: null };

export const samplePicks: Pick[] = [
  {
    faceId: "ATL-0412", rank: 1, affinity: 0.94, score: 0.93, costUsd: 6200,
    topTags: ["live comedy", "vinyl", "thrift fashion", "late-night ramen"],
    evidence: [heat(0.94), tag("live comedy", 0.91), photo("clear sightline, face fills 31% of frame", 0.31, "step-07"), event("holiday makers market two blocks away, 21 Nov", "step-16")],
    photoRead: { sightline: "clear", clutter: "low", faceShareOfFrame: 0.31, note: "Clear from the northbound lane; nothing between the road and the face." },
    events: [
      { title: "Little Five Points holiday makers market", date: "2026-11-21", distanceM: 240, url: "sample://event/l5p-makers-market" },
      { title: "Small Business Saturday on Moreland Ave", date: "2026-11-28", distanceM: 120, url: "sample://event/moreland-small-business-saturday" },
    ],
    copy: [
      line("Little Five laughs louder. Nov 21.", "Leads with the block's love of live comedy and lands on the market weekend."),
      line("Your record store guy is funnier live.", "Vinyl over-indexes here; a wink at the local shops."),
      line("Thrift the jacket. Keep the jokes.", "Thrift fashion is the block's third-strongest tag."),
    ],
    chosenCopy: 0, review: ok, tasteShifted: false,
  },
  {
    faceId: "ATL-0388", rank: 2, affinity: 0.89, score: 0.9, costUsd: 8400,
    topTags: ["stand-up comedy", "craft beer", "indie film", "food halls"],
    evidence: [heat(0.89), tag("stand-up comedy", 0.88), brand(0.84), photo("clear read for eastbound traffic, 24% of frame", 0.24, "step-08")],
    photoRead: { sightline: "clear", clutter: "medium", faceShareOfFrame: 0.24, note: "Digital face, clear for eastbound traffic; some storefront signage nearby." },
    events: [{ title: "Indie film night on the Eastside Trail", date: "2026-11-20", distanceM: 610, url: "sample://event/o4w-indie-film-night" }],
    copy: [
      line("Ponce, the punchline's two stops away.", "Commuter read on Ponce; stand-up is the top tag."),
      line("Skip the food hall line. Laugh.", "Food halls over-index; plays on the weekend queue."),
      line("Old Fourth Ward, Porchlight's on. Nov 20.", "Names the block and the tour's first local night."),
    ],
    chosenCopy: 0, review: ok, tasteShifted: false,
  },
  {
    faceId: "ATL-0527", rank: 3, affinity: 0.86, score: 0.85, costUsd: 5600,
    topTags: ["southern hip-hop", "soul food", "90s sitcom reruns", "record digging"],
    evidence: [heat(0.86), tag("southern hip-hop", 0.9), tag("90s sitcom reruns", 0.83), photo("clear sightline, 27% of frame", 0.27, "step-09")],
    photoRead: { sightline: "clear", clutter: "medium", faceShareOfFrame: 0.27, note: "Clear sightline; shop signs add some clutter at street level." },
    events: [{ title: "West End holiday art walk", date: "2026-11-22", distanceM: 380, url: "sample://event/west-end-art-walk" }],
    copy: [
      line("West End knows the punchline.", "Confident and local; comedy plus the block's sitcom love."),
      line("Laugh like it's a Friday rerun.", "90s sitcom reruns over-index; reworded by the guard.", {
        status: "rewritten", engine: "live-guard",
        reasons: ["First draft \"Real West End folks get the joke\" spoke for who lives there; reworded around what the block loves."],
        suggestion: "Laugh like it's a Friday rerun.",
      }),
      line("Bring the whole cookout. Nov 22.", "Soul food and the art walk weekend."),
    ],
    chosenCopy: 0, review: ok, tasteShifted: false,
  },
  {
    faceId: "ATL-0603", rank: 4, affinity: 0.81, score: 0.77, costUsd: 5200,
    topTags: ["dive bars", "punk shows", "open mics", "tattoo culture"],
    evidence: [heat(0.81), tag("open mics", 0.86), photo("partial: utility pole crosses lower left, 22% of frame", 0.22, "step-11")],
    photoRead: { sightline: "partial", clutter: "medium", faceShareOfFrame: 0.22, note: "A utility pole crosses the lower left corner; keep copy to the top two thirds." },
    events: [{ title: "Open mic marathon on Flat Shoals Ave", date: "2026-11-23", distanceM: 90, url: "sample://event/eav-open-mic-marathon" }],
    copy: [
      line("Open mic heroes, meet the pros.", "Open mics over-index; respect for the local scene."),
      line("Louder than your favourite dive bar.", "Dive bars are the block's top tag."),
      line("Heckle responsibly, East Atlanta. Nov 23.", "Cheeky, lands on the open mic marathon."),
    ],
    chosenCopy: 0, review: ok, tasteShifted: false,
  },
  {
    faceId: "ATL-0451", rank: 5, affinity: 0.78, score: 0.79, costUsd: 7600,
    topTags: ["comedy podcasts", "cocktail bars", "street art", "late-night tacos"],
    evidence: [heat(0.78), tag("comedy podcasts", 0.87), photo("clear read for westbound traffic, 29% of frame", 0.29, "step-12"), event("late-night taco crawl, 27 Nov", "step-18")],
    photoRead: { sightline: "clear", clutter: "low", faceShareOfFrame: 0.29, note: "Clear read for westbound traffic, low clutter." },
    events: [{ title: "Edgewood late-night taco crawl", date: "2026-11-27", distanceM: 300, url: "sample://event/edgewood-taco-crawl" }],
    copy: [
      line("Your favourite podcast, but live.", "Comedy podcasts over-index more here than anywhere else in the plan."),
      line("Edgewood after dark: jokes first.", "Cocktail-bar block; owns the night-out slot."),
      line("Tacos after. Jokes first. Nov 27.", "Ties the show to the taco crawl."),
    ],
    chosenCopy: 0, review: ok, tasteShifted: false,
  },
  {
    faceId: "ATL-0719", rank: 6, affinity: 0.74, score: 0.72, costUsd: 4800,
    topTags: ["gallery crawls", "Atlanta hip-hop", "sneaker culture", "rooftop bars"],
    evidence: [heat(0.74), tag("gallery crawls", 0.84), brand(0.79), event("second-Friday gallery crawl, 4 Dec", "step-17")],
    photoRead: null,
    events: [{ title: "Castleberry Hill second-Friday gallery crawl", date: "2026-12-04", distanceM: 150, url: "sample://event/castleberry-art-stroll" }],
    copy: [
      line("Castleberry, the gallery crawl gets funny.", "Gallery crawls are the block's signature taste."),
      line("Fresh kicks. Front row. Dec 4.", "Sneaker culture over-indexes; lands on the crawl."),
      line("Art walk Friday. Laugh Saturday.", "Pairs the crawl with the show night."),
    ],
    chosenCopy: 0, review: ok, tasteShifted: true,
  },
  {
    faceId: "ATL-0634", rank: 7, affinity: 0.71, score: 0.7, costUsd: 950,
    topTags: ["sitcom marathons", "neighbourhood pubs", "family brunch", "dog parks"],
    evidence: [heat(0.71), tag("sitcom marathons", 0.82), event("Kirkwood winter market, 5 Dec", "step-18")],
    photoRead: null,
    events: [{ title: "Kirkwood winter market", date: "2026-12-05", distanceM: 200, url: "sample://event/kirkwood-winter-market" }],
    copy: [
      line("Pause the sitcom. Come see it live.", "Sitcom marathons over-index; read at a bus stop, not at speed."),
      line("Kirkwood, date night is sorted.", "Pub-and-brunch block; a plan for two."),
      line("Better than a rerun, Kirkwood.", "Short, local, sitcom nod."),
    ],
    chosenCopy: 0, review: ok, tasteShifted: false,
  },
  {
    faceId: "ATL-0662", rank: 8, affinity: 0.68, score: 0.66, costUsd: 850,
    topTags: ["BeltLine art walks", "food trucks", "indie hip-hop", "skate culture"],
    evidence: [heat(0.68), tag("BeltLine art walks", 0.85), tag("indie hip-hop", 0.78)],
    photoRead: null,
    events: [],
    copy: [
      line("Ride the BeltLine to the punchline.", "Redrafted after review: BeltLine art walks are the block's top tag."),
      line("Food truck, then front row.", "Food trucks over-index on Memorial Dr."),
      line("Reynoldstown, laugh out loud. Dec 5.", "Names the block; local show date."),
    ],
    chosenCopy: 0,
    review: {
      status: "redrafted",
      note: "First line \"After dark, the jokes start\" echoed the Edgewood face two stops away; redrafted to the BeltLine line.",
    },
    tasteShifted: false,
  },
];
