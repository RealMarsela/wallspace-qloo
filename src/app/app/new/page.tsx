import { BriefForm } from "@/components/brief/BriefForm";
import { PageFrame, PageHeader } from "@/components/shell/PageHeader";

export const metadata = { title: "New brief" };

export default function NewBriefPage() {
  return (
    <PageFrame testId="brief-page">
      <PageHeader
        eyebrow="New brief · Atlanta"
        title="Who loves what?"
        lede="Tell the agent what the fans love, how much to spend and when. It picks the faces and writes a line for each, in about a minute."
      />
      <BriefForm />
    </PageFrame>
  );
}
