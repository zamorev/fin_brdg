import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
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

  // Новый onClick на каждый рендер не должен перерегистрировать MainButton (иначе кнопка мигает).
  const onClickRef = useRef(onClick);
  const enabledRef = useRef(enabled);
  const shownRef = useRef(false);
  useLayoutEffect(() => {
    onClickRef.current = onClick;
    enabledRef.current = enabled;
  });
  const handleClick = useCallback(() => onClickRef.current(), []);

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
      shownRef.current = true;
      setMainButton({
        text,
        enabled: enabledRef.current,
        visible: true,
        onClick: handleClick,
      });
    }, 450);
    return () => {
      window.clearTimeout(timer);
      shownRef.current = false;
      hideMainButton();
    };
  }, [text, visible, handleClick, setMainButton, hideMainButton, isTwa]);

  // enabled меняем на уже показанной кнопке, без hide/show и нового таймера.
  useEffect(() => {
    if (shownRef.current) setMainButton({ enabled });
  }, [enabled, setMainButton]);

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
