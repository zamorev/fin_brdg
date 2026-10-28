import { useEffect } from "react";
import { useTwa } from "../twa/TwaProvider";

/** delayMs — не вешать «Назад» сразу после тапа по списку (TWA ловит тот же жест). */
export function useBackAction(handler: (() => void) | null, delayMs = 0) {
  const { setBackHandler } = useTwa();
  useEffect(() => {
    if (!handler) {
      setBackHandler(null);
      return;
    }
    if (delayMs <= 0) {
      setBackHandler(handler);
      return () => setBackHandler(null);
    }
    const timer = window.setTimeout(() => setBackHandler(handler), delayMs);
    return () => {
      window.clearTimeout(timer);
      setBackHandler(null);
    };
  }, [handler, setBackHandler, delayMs]);
}
