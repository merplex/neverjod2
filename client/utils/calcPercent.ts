// "%" key of the numpad calculator — turns the last number into a percentage, like a phone
// calculator:
//   1000+7  %  → 1000+70     (7% of what comes before, for + and -)
//   1000-10 %  → 1000-100
//   200*15  %  → 200*0.15    (plain percent for * and /)
//   50      %  → 0.5
// Returns the expression unchanged if it doesn't end in a number.

function evaluate(expr: string): number | null {
  const clean = expr.replace(/\s+/g, "");
  if (!clean || !/^[\d+\-*/.]+$/.test(clean)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const v = new Function(`return ${clean}`)() as number;
    return typeof v === "number" && isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

const fmt = (n: number) => String(parseFloat(n.toFixed(4)));

export function applyPercent(expr: string): string {
  const m = expr.match(/(\d+\.?\d*|\.\d+)$/);
  if (!m) return expr;
  const n = parseFloat(m[1]);
  if (isNaN(n)) return expr;
  const head = expr.slice(0, expr.length - m[1].length);
  const op = head.slice(-1);
  if ((op === "+" || op === "-") && head.length > 1) {
    const base = evaluate(head.slice(0, -1));
    if (base === null) return expr;
    return head + fmt((base * n) / 100);
  }
  return head + fmt(n / 100);
}
