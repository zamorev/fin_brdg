import { useCallback, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  CATEGORY_LABELS,
  CATEGORY_MINIMUMS,
  CATEGORY_ORDER,
  formatRub,
  totalAllocation,
  validateAllocation,
  type Allocation,
  type CategoryKey,
} from "../domain/budget";
import { checkWeekBudget } from "../api/client";
import { MainAction } from "../components/MainAction";
import { useBackAction } from "../components/useBackAction";
import { useTwa } from "../twa/TwaProvider";
import { selfWeeklyBudget } from "../domain/memberBudget";
import type { SessionUser } from "../domain/types";

const STEP = 50;
/** Ширина бегунка — как в global.css (.slider-row input[type="range"]). */
const THUMB_PX = 28;

function categoryMin(key: CategoryKey): number {
  return CATEGORY_MINIMUMS[key] ?? 0;
}

/** Бегунок не уходит ниже минимума категории (как clamp_amount в v1). */
function clampToMin(key: CategoryKey, value: number): number {
  return Math.max(value, categoryMin(key));
}

function startValues(allocation: Allocation): Allocation {
  const a = { ...allocation };
  for (const key of CATEGORY_ORDER) a[key] = clampToMin(key, a[key] ?? 0);
  return a;
}

function statusText(total: number, budget: number): string {
  if (total < budget) return `Осталось распределить ${formatRub(budget - total)}`;
  if (total > budget) return `Распределено на ${formatRub(total - budget)} больше`;
  return "Бюджет распределён полностью";
}

function totalColor(total: number, budget: number): string {
  if (total === budget) return "var(--fb-success)";
  return total < budget ? "var(--fb-warning)" : "var(--fb-danger)";
}

type Props = {
  user: SessionUser;
  onBack: () => void;
  onSuccess: (user: SessionUser) => void;
  onContinueUnplanned: () => void;
};

export function QuestBudget({
  user,
  onBack,
  onSuccess,
  onContinueUnplanned,
}: Props) {
  const { haptic } = useTwa();
  const weeklyBudget = selfWeeklyBudget(user);
  const [values, setValues] = useState<Allocation>(() =>
    startValues(user.family.allocation),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const submittingRef = useRef(false);

  useBackAction(onBack);

  const total = useMemo(() => totalAllocation(values), [values]);

  const setValue = useCallback((key: CategoryKey, raw: number) => {
    const next = clampToMin(key, raw);
    setValues((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));
  }, []);

  /** Значение по координате пальца: тап по дорожке переносит бегунок (iOS WebView так не умеет). */
  const valueFromPointer = (e: PointerEvent<HTMLDivElement>): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    const usable = Math.max(rect.width - THUMB_PX, 1);
    const ratio = Math.min(Math.max((e.clientX - rect.left - THUMB_PX / 2) / usable, 0), 1);
    return Math.round((ratio * weeklyBudget) / STEP) * STEP;
  };

  const onCheck = useCallback(async () => {
    if (submittingRef.current) return;
    const local = validateAllocation(values, weeklyBudget);
    if (local.length) {
      setErrors(local.map((e) => e.message));
      haptic("error");
      return;
    }
    submittingRef.current = true;
    setErrors([]);
    try {
      const res = await checkWeekBudget(values);
      if (!res.ok) {
        setErrors(res.errors.map((e) => e.message));
        haptic("error");
        return;
      }
      haptic("success");
      onSuccess(res.user);
      if (!res.user.family.questUnplannedCompleted) {
        onContinueUnplanned();
      } else {
        onBack();
      }
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Не получилось — попробуй ещё"]);
      haptic("error");
    } finally {
      submittingRef.current = false;
    }
  }, [values, weeklyBudget, haptic, onSuccess, onContinueUnplanned, onBack]);

  return (
    <div className="app-shell">
      <p style={{ color: "var(--fb-hint)", margin: "0 0 8px", fontSize: "0.8125rem" }}>
        Квест 1 из 1
      </p>
      <h1 className="screen-title">Неделя на {formatRub(weeklyBudget)}</h1>
      <p className="screen-sub">
        У тебя есть {formatRub(weeklyBudget)} на неделю. Распредели сумму так, чтобы
        покрыть обязательные расходы, отложить на цель и оставить резерв на
        непредвиденное.
      </p>

      <div className="card">
        {CATEGORY_ORDER.map((key) => (
          <div className="slider-row" key={key}>
            <label>
              <span>{CATEGORY_LABELS[key]}</span>
              <strong>{formatRub(values[key])}</strong>
            </label>
            <div
              className="slider-track"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setValue(key, valueFromPointer(e));
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  setValue(key, valueFromPointer(e));
                }
              }}
            >
              <input
                type="range"
                min={0}
                max={weeklyBudget}
                step={STEP}
                value={values[key]}
                aria-label={CATEGORY_LABELS[key]}
                onChange={(e) => setValue(key, Number(e.target.value))}
              />
            </div>
          </div>
        ))}

        <div className="row-between" style={{ marginTop: 8 }}>
          <span>Распределено</span>
          <strong style={{ color: totalColor(total, weeklyBudget) }}>
            {total} из {formatRub(weeklyBudget)}
          </strong>
        </div>
        <p className="budget-status" aria-live="polite">
          {statusText(total, weeklyBudget)}
        </p>

        {errors.map((msg) => (
          <div className="error-banner" key={msg}>
            {msg}
          </div>
        ))}

        <MainAction
          text="Проверить мой бюджет"
          onClick={() => void onCheck()}
        />
      </div>
    </div>
  );
}
