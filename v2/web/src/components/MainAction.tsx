import { useEffect } from "react";
import { useTwa } from "../twa/TwaProvider";

type Props = {
  text: string;
  enabled?: boolean;
  visible?: boolean;
  onClick: () => void;
};

/** Синхронизирует действие с Telegram MainButton; в браузере — fallback-кнопка. */
export function MainAction({
  text,
  enabled = true,
  visible = true,
  onClick,
}: Props) {
  const { setMainButton, hideMainButton, isTwa } = useTwa();

  useEffect(() => {
    if (!visible) {
      hideMainButton();
      return;
    }
    if (!isTwa) {
      return;
    }
    // MainButton появляется после тапа по списку — иначе TWA ловит «хвост» жеста как «Готово».
    const timer = window.setTimeout(() => {
      setMainButton({ text, enabled, visible: true, onClick });
    }, 450);
    return () => {
      window.clearTimeout(timer);
      hideMainButton();
    };
  }, [text, enabled, visible, onClick, setMainButton, hideMainButton, isTwa]);

  if (isTwa) return null;

  return (
    <button
      type="button"
      className="btn-primary-fallback"
      disabled={!enabled}
      onClick={onClick}
    >
      {text}
    </button>
  );
}
