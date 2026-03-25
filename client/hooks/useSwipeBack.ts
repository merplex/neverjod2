import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function getSwipeBackDirection(): "right" | "left" {
  try {
    const s = JSON.parse(localStorage.getItem("app_settings") || "{}");
    return s.swipeBackDirection ?? "right";
  } catch {
    return "right";
  }
}

export function useSwipeBack() {
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }

    function onTouchEnd(e: TouchEvent) {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;

      // Ignore if more vertical than horizontal
      if (Math.abs(dy) > Math.abs(dx)) return;
      // Require minimum swipe distance
      if (Math.abs(dx) < 60) return;

      const direction = getSwipeBackDirection();
      const isSwipeRight = dx > 0;
      if ((direction === "right" && isSwipeRight) || (direction === "left" && !isSwipeRight)) {
        navigate("/");
      }

      touchStartX.current = null;
      touchStartY.current = null;
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [navigate]);
}
