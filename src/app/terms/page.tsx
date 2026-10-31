import type { Metadata } from "next";
import Link from "next/link";
import { Block, PublicPage } from "@/components/site/PublicPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Wallspace, a non-production hackathon build for out-of-home planning by taste.",
};

const CONTACT = "testerbuster564@gmail.com";

export default function TermsPage() {
  return (
    <PublicPage
      testId="terms"
      toc
      eyebrow="Effective 30 October 2026"
      title="Terms of use"
      lede={
        <>
          These terms cover your use of Wallspace, including its website, the sample plan, media-owner mode and the
          integrations you connect. By using Wallspace you agree to them. Questions:{" "}
          <a data-testid="terms-contact" className="text-on-night underline underline-offset-4" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </>
      }
    >
      <Block title="A hackathon build, not a production service" id="hackathon">
        <p>
          Wallspace was built for the Qloo Agentic Hackathon and the Nebius × NVIDIA hackathon. It is offered free, for
          evaluation and demonstration. Nothing is sold through it, there are no payments, and it may change, break or shut
          down at any time. It is expected to run until the end of hackathon judging in December 2026.
        </p>
      </Block>

      <Block title="Sample data" id="sample">
        <p>
          The brand in the demo (Porchlight Comedy Tour) is fictional. Some faces are added samples placed on real roads, and
          every face size, read side and rate is a sample generated from typical ranges. Each is labelled. None of it is a
          media owner&apos;s rate card, a statement of availability, or an offer to sell advertising space.
        </p>
      </Block>

      <Block title="Acceptable use" id="use">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Plan by taste only. Do not try to target or describe people by race, religion, sexuality, health or other identity; the guard refuses these requests.</li>
          <li>Do not use Wallspace to create unlawful, deceptive or harassing advertising, or to send messages to people who have not agreed to hear from you.</li>
          <li>Do not attempt to get around rate limits, overload the service, extract the underlying taste data in bulk, or access accounts that are not yours.</li>
        </ul>
      </Block>

      <Block title="Your content" id="content">
        <p>
          You keep ownership of the briefs, photos and creative you provide. You give Wallspace permission to process them,
          and to send them to the services listed in the <Link data-testid="terms-link-privacy" className="underline" href="/privacy">privacy policy</Link>,
          only to produce your plans and deliver them where you ask. Only upload material you have the right to use.
        </p>
      </Block>

      <Block title="Connected accounts" id="connections">
        <p>
          When you connect a tool such as Gmail, Outlook, Slack, HubSpot, Google Sheets, Notion or a calendar, you authorise
          Wallspace to take the actions you start from a plan: send an email, post an approval message, create or update a
          deal, sheet, page or calendar event. Wallspace acts only when you press a button, and reads back only the replies
          and changes tied to what it sent. You are responsible for the recipients you choose. You can disconnect at any
          time on the Connections page. Each connected service&apos;s own terms also apply.
        </p>
      </Block>

      <Block title="AI output and taste data" id="ai">
        <p>
          Plans, scores and copy are produced by AI models and taste data and can be wrong. Review every line before it is
          printed or sent. Taste data from Qloo is used under hackathon access terms and is not offered for production use.
        </p>
      </Block>

      <Block title="No warranty, limited liability" id="liability">
        <p>
          Wallspace is provided &ldquo;as is&rdquo;, without warranties of any kind, including fitness for a particular purpose or
          accuracy of results. To the extent the law allows, its makers are not liable for any indirect, incidental or
          consequential loss, or for any decision made using it.
        </p>
      </Block>

      <Block title="Ending use and changes" id="changes">
        <p>
          You can stop using Wallspace at any time and ask for your data to be deleted. Access may be limited or ended for
          anyone who breaks these terms. If the terms change, the new version will be posted here with a new effective date.
        </p>
      </Block>
    </PublicPage>
  );
}
