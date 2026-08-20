// Lets a page with an open modal/edit form claim the Android "backbutton" event
// (hardware back + edge-swipe gesture) so it closes the form instead of
// BottomNavLayout's default behavior of navigating to "/" and discarding state.
type BackHandler = () => void;

const stack: BackHandler[] = [];

export function pushBackHandler(handler: BackHandler) {
  stack.push(handler);
}

export function popBackHandler(handler: BackHandler) {
  const idx = stack.lastIndexOf(handler);
  if (idx !== -1) stack.splice(idx, 1);
}

// Returns true if a handler consumed the event (caller should not navigate).
export function consumeBackHandler(): boolean {
  if (stack.length === 0) return false;
  stack[stack.length - 1]();
  return true;
}
