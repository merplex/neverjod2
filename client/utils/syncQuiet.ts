// Writes made BY the sync engine itself (merging pulled data, recording what was pushed) must not
// trigger the "push after every action" hook — that would loop forever. Sync wraps its
// synchronous localStorage write blocks in quietly(); the auto-push hook ignores writes made inside.
let depth = 0;

export function quietly<T>(fn: () => T): T {
  depth++;
  try { return fn(); } finally { depth--; }
}

export function isQuiet(): boolean {
  return depth > 0;
}
