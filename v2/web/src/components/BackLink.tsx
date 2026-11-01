import { ChevronLeft } from "./ParentIcons";

/** «‹ Главная» в шапке — дублирует Telegram BackButton. */
export function BackLink({ label = "Главная", onClick }: { label?: string; onClick: () => void }) {
  return (
    <button type="button" className="screen-back" onClick={onClick}>
      <ChevronLeft />
      {label}
    </button>
  );
}
