import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { SampleStamp, Tag } from "@/components/ui/Pill";
import { Table, TableFrame, Td, Th, Tr } from "@/components/ui/Table";
import type { Variant } from "./steps";

export const CONTACT = "testerbuster564@gmail.com"; // the address on /privacy and /terms

export interface HelpSection {
  id: string;
  title: string;
  body: ReactNode;
}

const P = ({ children }: { children: ReactNode }) => <p className="text-body text-ink-2">{children}</p>;
const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-ink underline underline-offset-4 hover:text-cobalt-deep">
    {children}
  </Link>
);

function Rows({ head, rows, label }: { head: string[]; rows: ReactNode[][]; label: string }) {
  return (
    <TableFrame label={label}>
      <Table className="min-w-[560px]">
        <thead>
          <tr>
            {head.map((h) => (
              <Th key={h}>{h}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <Tr key={i}>
              {r.map((c, j) => (
                <Td key={j} className={j === 0 ? "whitespace-nowrap" : "text-small text-ink-2"}>
                  {c}
                </Td>
              ))}
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableFrame>
  );
}

/** Help topics. Facts come from the README, the route map and the app's own copy; nothing here is a made-up number. */
export function helpSections(v: Variant): HelpSection[] {
  const app = (path: string, pub: string) => (v === "app" ? path : pub);
  return [
    {
      id: "brief",
      title: "Writing a brief",
      body: (
        <>
          <P>
            A brief says who loves what, how much you can spend and when. Describe the audience by its tastes: artists, shows, genres,
            places. Add up to eight loves as tags, then say it in your own words; Qwen3 Embedding 8B turns that sentence into the closest
            Qloo taste tags.
          </P>
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-line bg-surface p-3" aria-label="Example loves from the sample brief">
            <span className="text-micro text-muted">Fans of</span>
            {["stand-up comedy specials", "90s sitcoms", "southern hip-hop"].map((t, i) => (
              <Tag key={t} ink={(["signal", "lilac", "park"] as const)[i]}>
                {t}
              </Tag>
            ))}
          </div>
          <P>
            Set the budget in US dollars and pick the flight on the calendar: outdoor books in whole weeks, so the end date snaps to a week.
            Brand voice is optional and steers the copy. Most runs finish in about a minute, and you can watch every step live.
          </P>
          <P>
            {v === "app" ? <A href="/app/new">Write a brief</A> : <A href="/signin?next=/app/new">Sign in to write a brief</A>} or start from
            one of the presets on the brief page.
          </P>
        </>
      ),
    },
    {
      id: "guard",
      title: "The taste-only guard",
      body: (
        <>
          <P>
            Wallspace plans by taste, never by identity. The live guard checks the brief as you type and every copy line as it is written.
            It refuses targeting by race, religion, sexuality, health, age or other identity. It is our own code applying the NeMo
            Guardrails policy, with Nemotron 3.5 Lightning only for unclear wording.
          </P>
          <P>
            A refusal says why and offers the same brief written as tastes. One click puts the rewrite in the form; you can edit it from
            there. When you sign a plan off, NVIDIA NeMo Guardrails re-checks every line as a Nebius Serverless Job, and the plan shows the
            job ID once it passes.
          </P>
          <div className="flex flex-wrap gap-2">
            <Badge status="guard">Refused: identity</Badge>
            <Badge status="ok">Live guard: pass</Badge>
            <Badge status="info">Awaiting NeMo sign-off</Badge>
            <Badge status="ok">NeMo-checked</Badge>
          </div>
          <P>
            The guard&apos;s refusal counts and the NeMo red-team catch and false-positive rates are on <A href="/limits">Limits</A>.
          </P>
        </>
      ),
    },
    {
      id: "labels",
      title: "Real and sample data",
      body: (
        <>
          <P>Every invented value is labelled where it appears. The labels mean:</P>
          <Rows
            label="Data labels"
            head={["Label", "What it means", "Where you see it"]}
            rows={[
              [<Tag key="r" ink="park" dot>real</Tag>, "Recorded data: an OpenStreetMap billboard position, or a Qloo answer with its lift against Atlanta.", "46 of the 86 faces; block tags with an “x vs Atlanta” value"],
              [<SampleStamp key="s">sample</SampleStamp>, "Invented for the demo and stamped: the Porchlight Comedy Tour brand, 40 faces added on real streets, every face's size, rate and owner.", "Plan header, face sheets, rates"],
              [<Tag key="p">photo credit</Tag>, "Site photos are illustrative Wikimedia Commons images near the face, not the exact site. Each one is credited.", "Face sheet, under the photo"],
            ]}
          />
        </>
      ),
    },
    {
      id: "plan",
      title: "Reading a plan",
      body: (
        <>
          <P>
            The map shows where the audience lives: Qloo&apos;s affinity by place, from light yellow to red. Numbered billboards are the
            picks, in rank order; small dots are faces that were scored but not picked. Each row in the picks table gives the face, its
            neighbourhood, type, weekly cost, the tags its block over-indexes on and the line written for it.
          </P>
          <P>
            A tag like <Tag ink="signal">Lively <b className="font-mono font-medium">4x</b></Tag> means the tag ranks four times higher around
            this face than across Atlanta. The budget split keeps any one neighbourhood under 30% of spend.
          </P>
          <Rows
            label="Status chips"
            head={["Chip", "What it tells you"]}
            rows={[
              [<Badge key="1" status="running">Running</Badge>, "The agent is still working. Open the run to watch it."],
              [<Badge key="2" status="warn">Ready</Badge>, "Every face is picked and written. Sign it off to queue the NeMo check."],
              [<Badge key="3" status="ok">NeMo-checked</Badge>, "NeMo Guardrails passed every line; the job ID is on the plan."],
              [<Badge key="4" status="info">Vision-checked</Badge>, "Nemotron 3.5 Super VL read this face's site photo for sightline and clutter."],
              [<Badge key="5" status="warn">Redrafted</Badge>, "Nemotron 3 Ultra 550B flagged the face in review and Lightning rewrote its lines."],
              [<Badge key="6" status="neutral">Taste shifted</Badge>, "The nightly re-scan found the block's audience has moved since the plan was made."],
            ]}
          />
          <P>
            Open <A href="/sample">the sample plan</A> or <A href="/sample/run">its run</A> to see each of these.
          </P>
        </>
      ),
    },
    {
      id: "connectors",
      title: "Connectors",
      body: (
        <>
          <P>
            Plans go out to the tools you already use and replies come back. Wallspace acts only when you press a button. Tokens for Google,
            Microsoft and HubSpot are held by Composio and never shown in the app. Read-back is polled every ten minutes and while a plan is
            open; it is not real time.
          </P>
          <Rows
            label="Connectors"
            head={["Tool", "What Wallspace sends", "What comes back"]}
            rows={[
              ["Slack", "An approval message with Approve and Request changes buttons", "Button presses, as signed requests"],
              ["Gmail, Outlook", "The plan to a client or media owner, and owner pitch sheets", "Replies, sorted by Lightning: confirmed, counter-offer, unavailable or question"],
              ["HubSpot", "Company, contact and deal, with a note listing faces and copy", "Deal stage"],
              ["Google Sheets", "One row per face plus a summary tab", "Cost and copy edits"],
              ["Google Calendar, Outlook Calendar", "Creative-due, posting and takedown dates", "Date changes"],
              ["OpenOOH export", "A venue list in the OpenOOH taxonomy for DOOH platforms", "Nothing: prepared only, never submitted"],
            ]}
          />
          <P>{v === "app" ? <A href="/app/connections">Connect your tools</A> : <A href="/signin?next=/app/connections">Sign in to connect your tools</A>}.</P>
        </>
      ),
    },
    {
      id: "limits",
      title: "Limits",
      body: (
        <>
          <P>
            Atlanta only, with 86 faces. Each workspace gets three live plan runs a day; the sample plan is always open. Qloo and Tavily
            answers are cached and capped. Live inventory availability, measurement and programmatic DOOH delivery are not built yet.
          </P>
          <P>
            Measured cost per plan, faces dropped for thin evidence and the guard&apos;s rates are on <A href="/limits">Limits</A>. How each
            step runs is on <A href={app("/app/how", "/sample/how")}>How it works</A>.
          </P>
        </>
      ),
    },
    {
      id: "contact",
      title: "Contact",
      body: (
        <>
          <P>
            Questions, a bug, or a request to see or delete your data: email{" "}
            <a data-testid="help-contact" href={`mailto:${CONTACT}`} className="text-ink underline underline-offset-4">
              {CONTACT}
            </a>
            . We reply to data requests within 7 days.
          </P>
          <P>
            <A href="/privacy">Privacy</A> · <A href="/terms">Terms</A>
          </P>
        </>
      ),
    },
  ];
}
