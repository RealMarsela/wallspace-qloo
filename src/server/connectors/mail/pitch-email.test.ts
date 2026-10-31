import { describe, expect, it } from "vitest";
import { faces, owners } from "@/data/faces";
import { sampleAudienceCard } from "@/mocks/connectors-comms";
import { buildPitch, ownerLabel } from "./pitch-email";
import { pitchBlocks } from "../slack/pitch-blocks";

const face = faces.find((f) => f.location === "sample") ?? faces[0];
const peachline = owners.find((o) => o.id === "own-peachline")!;
const card = sampleAudienceCard(face.id).card;
const count = (s: string, needle: string) => s.split(needle).length - 1;

describe("pitch owner label", () => {
  it("prints the sample label once, whether or not the name already carries it", () => {
    expect(ownerLabel(peachline)).toBe("Peachline Outdoor (sample)");
    expect(ownerLabel({ name: "Peachline Outdoor", sample: true })).toBe("Peachline Outdoor (sample)");
    expect(ownerLabel({ name: "Clear Channel", sample: false })).toBe("Clear Channel");
    expect(ownerLabel(null)).toBe("Media owner");
  });

  it("email and Slack builders never double the label", () => {
    const pitch = buildPitch(face, peachline, card, `https://example.test/faces/${face.id}`);
    for (const body of [pitch.html, pitch.text]) {
      expect(body).not.toContain("(sample) (sample)");
      expect(count(body, "Peachline Outdoor (sample)")).toBe(1);
    }
    const slack = JSON.stringify(pitchBlocks(face, peachline, card, `https://example.test/faces/${face.id}`));
    expect(slack).not.toContain("(sample) (sample)");
    expect(slack).toContain("Peachline Outdoor (sample)");
  });
});
