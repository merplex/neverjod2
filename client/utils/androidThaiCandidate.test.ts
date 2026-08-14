import { describe, it, expect } from "vitest";
import { extractNumberFromText } from "./keywordMatch";
import {
  EMPTY_CANDIDATE,
  chooseThaiTextForAmount,
  countThaiUnits,
  pickBestFinalAlternative,
  trackInterimCandidate,
} from "./androidThaiCandidate";

describe("countThaiUnits", () => {
  it("counts unit words, ignoring digits", () => {
    expect(countThaiUnits("เจ็ดหมื่นแปดร้อย")).toBe(2);
    expect(countThaiUnits("เจ็ดหมื่นแปด")).toBe(1);
    expect(countThaiUnits("7800")).toBe(0);
  });
});

describe("trackInterimCandidate — keeps the most complete interim, not just the latest", () => {
  it("replays a real ASR interim sequence for 70,800 (เจ็ดหมื่นแปดร้อย)", () => {
    // ASR streams interim guesses as it listens, then "reconsiders" and drops
    // a unit word right before the final result — this is the exact failure
    // mode reported: 70,800 spoken as "เจ็ดหมื่นแปดร้อย" collapsing to
    // 7,800 / 70,000 / 78 because the app used to trust whatever interim came
    // in last, even if it was less complete than an earlier one.
    let candidate = EMPTY_CANDIDATE;
    candidate = trackInterimCandidate(candidate, "เจ็ด");                 // 0 units — ignored
    candidate = trackInterimCandidate(candidate, "เจ็ดหมื่น");             // 1 unit
    candidate = trackInterimCandidate(candidate, "เจ็ดหมื่นแปดร้อย");      // 2 units — the good guess
    candidate = trackInterimCandidate(candidate, "เจ็ดหมื่นแปด");          // ASR "corrects" down to 1 unit

    // The 2-unit candidate must survive the later 1-unit "correction".
    expect(candidate.text).toBe("เจ็ดหมื่นแปดร้อย");
    expect(candidate.unitCount).toBe(2);
    expect(extractNumberFromText(candidate.text)).toBe(70_800);
  });

  it("does still accept a later interim that is equally or more complete", () => {
    let candidate = EMPTY_CANDIDATE;
    candidate = trackInterimCandidate(candidate, "เจ็ดหมื่น");
    candidate = trackInterimCandidate(candidate, "เจ็ดหมื่นแปดร้อย");
    expect(candidate.text).toBe("เจ็ดหมื่นแปดร้อย");
    expect(candidate.unitCount).toBe(2);
  });
});

describe("pickBestFinalAlternative — picks the most complete alternative, not the first Thai one", () => {
  it("skips a partial alternative in favor of a fuller one later in the list", () => {
    const best = pickBestFinalAlternative(["7800", "เจ็ดพัน", "เจ็ดหมื่นแปดร้อย", "เจ็ดหมื่นแปด"]);
    expect(best.text).toBe("เจ็ดหมื่นแปดร้อย");
    expect(best.unitCount).toBe(2);
  });

  it("returns EMPTY_CANDIDATE when no alternative has Thai units", () => {
    const best = pickBestFinalAlternative(["7800", "78000"]);
    expect(best).toEqual(EMPTY_CANDIDATE);
  });
});

describe("chooseThaiTextForAmount", () => {
  it("prefers the tracked interim when it is more complete than the final alternatives", () => {
    const interim = { text: "เจ็ดหมื่นแปดร้อย", unitCount: 2 };
    const finalAlt = { text: "เจ็ดหมื่นแปด", unitCount: 1 };
    expect(chooseThaiTextForAmount(interim, finalAlt, "7800")).toBe("เจ็ดหมื่นแปดร้อย");
  });

  it("prefers the final alternative on a tie", () => {
    const interim = { text: "เจ็ดหมื่นแปดร้อย", unitCount: 2 };
    const finalAlt = { text: "เจ็ดหมื่นแปดร้อยห้าสิบ", unitCount: 3 };
    expect(chooseThaiTextForAmount(interim, finalAlt, "7850")).toBe("เจ็ดหมื่นแปดร้อยห้าสิบ");
  });

  it("falls back to the raw final transcript when neither candidate has Thai units", () => {
    expect(chooseThaiTextForAmount(EMPTY_CANDIDATE, EMPTY_CANDIDATE, "7800")).toBe("7800");
  });

  it("never blends digits from two different candidates into one number", () => {
    // Two competing full guesses that tie on unit count — the result must be
    // one complete candidate's text, never a hybrid of both.
    const interim = { text: "เจ็ดล้านหกร้อย", unitCount: 2 };
    const finalAlt = { text: "หกล้านเจ็ดร้อย", unitCount: 2 };
    const chosen = chooseThaiTextForAmount(interim, finalAlt, "");
    expect([interim.text, finalAlt.text]).toContain(chosen);
    expect(extractNumberFromText(chosen)).not.toBe(7_000_700);
  });
});
