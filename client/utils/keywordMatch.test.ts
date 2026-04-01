import { describe, it, expect } from "vitest";
import { extractNumberFromText } from "./keywordMatch";

// ---------------------------------------------------------------------------
// Thai number parsing — skip-level scenarios
// Tests cover all combinations of place-value units to verify that
// the parser handles skipped intermediate levels correctly.
// ---------------------------------------------------------------------------

describe("extractNumberFromText — full consecutive units", () => {
  it("ล้านแสนหมื่นพันร้อยสิบ", () => {
    // 1×1,000,000 + 1×100,000 + 1×10,000 + 1×1,000 + 1×100 + 1×10 = 1,111,110
    expect(extractNumberFromText("หนึ่งล้านหนึ่งแสนหนึ่งหมื่นหนึ่งพันหนึ่งร้อยสิบ")).toBe(1_111_110);
  });
});

describe("extractNumberFromText — ล้าน skipping lower levels", () => {
  it("ล้านหมื่นพันร้อยสิบ (ข้ามแสน)", () => {
    // 1×1,000,000 + 1×10,000 + 1×1,000 + 1×100 + 1×10 = 1,011,110
    expect(extractNumberFromText("หนึ่งล้านหนึ่งหมื่นหนึ่งพันหนึ่งร้อยสิบ")).toBe(1_011_110);
  });

  it("ล้านพันร้อยสิบ (ข้ามแสนหมื่น)", () => {
    // 1×1,000,000 + 1×1,000 + 1×100 + 1×10 = 1,001,110
    expect(extractNumberFromText("หนึ่งล้านหนึ่งพันหนึ่งร้อยสิบ")).toBe(1_001_110);
  });

  it("ล้านร้อยสิบ (ข้ามแสนหมื่นพัน)", () => {
    // 1×1,000,000 + 1×100 + 1×10 = 1,000,110
    expect(extractNumberFromText("หนึ่งล้านหนึ่งร้อยสิบ")).toBe(1_000_110);
  });

  it("ล้านสิบ (ข้ามแสนหมื่นพันร้อย)", () => {
    // 1×1,000,000 + 1×10 = 1,000,010
    expect(extractNumberFromText("หนึ่งล้านสิบ")).toBe(1_000_010);
  });
});

describe("extractNumberFromText — แสน skipping lower levels", () => {
  it("แสนหมื่นพันร้อยสิบ (consecutive)", () => {
    // 1×100,000 + 1×10,000 + 1×1,000 + 1×100 + 1×10 = 111,110
    expect(extractNumberFromText("หนึ่งแสนหนึ่งหมื่นหนึ่งพันหนึ่งร้อยสิบ")).toBe(111_110);
  });

  it("แสนพันร้อยสิบ (ข้ามหมื่น)", () => {
    // 1×100,000 + 1×1,000 + 1×100 + 1×10 = 101,110
    expect(extractNumberFromText("หนึ่งแสนหนึ่งพันหนึ่งร้อยสิบ")).toBe(101_110);
  });

  it("แสนร้อยสิบ (ข้ามหมื่นพัน)", () => {
    // 1×100,000 + 1×100 + 1×10 = 100,110
    expect(extractNumberFromText("หนึ่งแสนหนึ่งร้อยสิบ")).toBe(100_110);
  });

  it("แสนสิบ (ข้ามหมื่นพันร้อย)", () => {
    // 1×100,000 + 1×10 = 100,010
    expect(extractNumberFromText("หนึ่งแสนสิบ")).toBe(100_010);
  });
});

describe("extractNumberFromText — หมื่น skipping lower levels", () => {
  it("หมื่นพันร้อยสิบ (consecutive)", () => {
    // 1×10,000 + 1×1,000 + 1×100 + 1×10 = 11,110
    expect(extractNumberFromText("หนึ่งหมื่นหนึ่งพันหนึ่งร้อยสิบ")).toBe(11_110);
  });

  it("หมื่นร้อยสิบ (ข้ามพัน)", () => {
    // 1×10,000 + 1×100 + 1×10 = 10,110
    expect(extractNumberFromText("หนึ่งหมื่นหนึ่งร้อยสิบ")).toBe(10_110);
  });

  it("หมื่นสิบ (ข้ามพันร้อย)", () => {
    // 1×10,000 + 1×10 = 10,010
    expect(extractNumberFromText("หนึ่งหมื่นสิบ")).toBe(10_010);
  });
});

describe("extractNumberFromText — พัน skipping lower levels", () => {
  it("พันร้อยสิบ (consecutive)", () => {
    // 1×1,000 + 1×100 + 1×10 = 1,110
    expect(extractNumberFromText("หนึ่งพันหนึ่งร้อยสิบ")).toBe(1_110);
  });

  it("พันสิบ (ข้ามร้อย)", () => {
    // 1×1,000 + 1×10 = 1,010
    expect(extractNumberFromText("หนึ่งพันสิบ")).toBe(1_010);
  });
});

describe("extractNumberFromText — mixed digit+Thai (realistic speech output)", () => {
  it("2ล้าน5พัน", () => expect(extractNumberFromText("2ล้าน5พัน")).toBe(2_005_000));
  it("3แสน2พัน", () => expect(extractNumberFromText("3แสน2พัน")).toBe(302_000));
  it("5แสน200", () => expect(extractNumberFromText("ห้าแสนสองร้อย")).toBe(500_200));
  it("4แสน4หมื่น", () => expect(extractNumberFromText("สี่แสนสี่หมื่น")).toBe(440_000));
  it("2แสน3หมื่น", () => expect(extractNumberFromText("สองแสนสามหมื่น")).toBe(230_000));
  it("5แสน", () => expect(extractNumberFromText("ห้าแสน")).toBe(500_000));
  it("แปดหมื่นสามสิบ (ASR-split: 80000 30)", () => expect(extractNumberFromText("80000 30")).toBe(80_030));
});
