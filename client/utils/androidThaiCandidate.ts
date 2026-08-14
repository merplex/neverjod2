// Android-only helpers for picking the most reliable Thai-worded ASR transcript
// before Google's speech recognizer normalizes it into (sometimes wrong) digits.
// Extracted from Recording.tsx so the selection logic can be unit-tested without
// mocking the SpeechRecognition/DOM APIs.

const THAI_UNIT_RE_G = /แสน|หมื่น|พัน|ร้อย|สิบ|ล้าน/g;

export function countThaiUnits(s: string): number {
  return (s.match(THAI_UNIT_RE_G) || []).length;
}

export interface ThaiCandidate {
  text: string;
  unitCount: number;
}

export const EMPTY_CANDIDATE: ThaiCandidate = { text: "", unitCount: 0 };

// Called for each interim result as it streams in. Keeps the MOST COMPLETE
// candidate seen so far (most Thai unit words) rather than always taking the
// latest one — ASR sometimes revises a fuller hypothesis ("...หมื่นแปดร้อย")
// down to a partial one ("...หมื่นแปด") right before finalizing, and a naive
// "latest wins" policy would silently lose the more accurate earlier guess.
export function trackInterimCandidate(prev: ThaiCandidate, transcriptPart: string): ThaiCandidate {
  const unitCount = countThaiUnits(transcriptPart);
  if (unitCount > 0 && unitCount >= prev.unitCount) {
    return { text: transcriptPart, unitCount };
  }
  return prev;
}

// Scans a final result's alternative transcripts and picks the one with the
// most Thai unit words (most complete), not just the first one that happens
// to contain any Thai text.
export function pickBestFinalAlternative(alternatives: string[]): ThaiCandidate {
  let best = EMPTY_CANDIDATE;
  for (const alt of alternatives) {
    const unitCount = countThaiUnits(alt);
    if (unitCount > best.unitCount) best = { text: alt, unitCount };
  }
  return best;
}

// Final choice between the tracked interim candidate and the best final
// alternative: whichever is more complete wins (ties go to the final
// alternative, since it comes from more fully processed audio).
export function chooseThaiTextForAmount(
  interim: ThaiCandidate,
  finalAlt: ThaiCandidate,
  fallback: string,
): string {
  if (finalAlt.unitCount >= interim.unitCount) {
    return finalAlt.text || interim.text || fallback;
  }
  return interim.text || finalAlt.text || fallback;
}
