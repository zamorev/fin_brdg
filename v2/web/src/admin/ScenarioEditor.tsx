import type { ScenarioDefinition } from "../api/adminClient";
import {
  delayMsToHoursMinutes,
  hoursMinutesToDelayMs,
  nodeDisplayName,
  normalizeSpendEffects,
  optionOutcomeHint,
} from "./scenarioUiHelpers";
import { OptionBudgetEditor } from "./OptionBudgetEditor";

type Props = {
  scenario: ScenarioDefinition;
  nodeId: string | null;
  busy: boolean;
  onScenarioChange: (s: ScenarioDefinition) => void;
  onNodeIdChange: (id: string) => void;
  onAddNode: () => void;
  onRemoveNode: () => void;
  onRemoveOption: (idx: number) => void;
  onSave: () => void;
};

export function ScenarioEditor({
  scenario,
  nodeId,
  busy,
  onScenarioChange,
  onNodeIdChange,
  onAddNode,
  onRemoveNode,
  onRemoveOption,
  onSave,
}: Props) {
  const nodeIds = Object.keys(scenario.nodes);
  const currentNode = nodeId ? scenario.nodes[nodeId] : null;
  const currentStepIndex = nodeId ? nodeIds.indexOf(nodeId) : -1;

  const updateNode = (patch: Partial<ScenarioDefinition["nodes"][string]>) => {
    if (!nodeId) return;
    onScenarioChange({
      ...scenario,
      nodes: {
        ...scenario.nodes,
        [nodeId]: { ...scenario.nodes[nodeId], ...patch, id: nodeId },
      },
    });
  };

  return (
    <div className="admin-editor">
      <div className="admin-callout">
        <strong>Как устроен квест</strong>
        <ol className="admin-callout__list">
          <li>
            <strong>Экран</strong> — сообщение в приложении / боте (один текст).
          </li>
          <li>
            Под текстом — <strong>кнопки</strong>: что может выбрать подросток.
          </li>
          <li>
            После выбора — либо <strong>следующий экран</strong> (можно с паузой), либо{" "}
            <strong>конец квеста</strong>.
          </li>
          <li>
            При необходимости — <strong>списание с бюджета</strong> (категория и сумма, как в
            квесте про распределение).
          </li>
        </ol>
        <p className="admin-toolbar__hint" style={{ margin: "10px 0 0" }}>
          Чтобы изменения попали к пользователям, нажми «Сохранить» в шапке справа.
        </p>
      </div>

      <section className="admin-editor-section">
        <h4 className="admin-editor-section__title">Название квеста</h4>
        <p className="admin-toolbar__hint" style={{ margin: "0 0 8px" }}>
          Как задание называется в списке у подростка.
        </p>
        <input
          className="admin-input"
          value={scenario.title}
          onChange={(e) => onScenarioChange({ ...scenario, title: e.target.value })}
        />
      </section>

      <section className="admin-editor-section">
        <h4 className="admin-editor-section__title">С какого экрана начать</h4>
        <select
          className="admin-select"
          value={scenario.startNodeId}
          onChange={(e) => onScenarioChange({ ...scenario, startNodeId: e.target.value })}
        >
          {nodeIds.map((id, i) => (
            <option key={id} value={id}>
              {nodeDisplayName(id, scenario.nodes[id]?.prompt, i)}
            </option>
          ))}
        </select>
      </section>

      <section className="admin-editor-section">
        <h4 className="admin-editor-section__title">Экраны квеста</h4>
        <p className="admin-toolbar__hint" style={{ margin: "0 0 10px" }}>
          Выбери экран, чтобы редактировать текст и кнопки. «+ экран» — новая сцена в цепочке.
        </p>
        <div className="admin-step-chips">
          {nodeIds.map((id, i) => (
            <button
              key={id}
              type="button"
              className={`admin-step-chip${nodeId === id ? " admin-step-chip--active" : ""}`}
              title={scenario.nodes[id]?.prompt}
              onClick={() => onNodeIdChange(id)}
            >
              {nodeDisplayName(id, scenario.nodes[id]?.prompt, i)}
            </button>
          ))}
          <button type="button" className="admin-btn admin-btn--sm" onClick={onAddNode}>
            + экран
          </button>
        </div>
      </section>

      {currentNode && nodeId && currentStepIndex >= 0 ? (
        <section className="admin-editor-section admin-editor-section--highlight">
          <div className="admin-toolbar" style={{ marginBottom: 12 }}>
            <h4 className="admin-editor-section__title" style={{ margin: 0 }}>
              Экран {currentStepIndex + 1}
            </h4>
            <button
              type="button"
              className="admin-btn admin-btn--danger admin-btn--sm"
              disabled={busy || scenario.startNodeId === nodeId}
              title={
                scenario.startNodeId === nodeId
                  ? "Нельзя удалить стартовый экран — сначала выбери другой «С какого экрана начать»"
                  : undefined
              }
              onClick={onRemoveNode}
            >
              Удалить экран
            </button>
          </div>

          <label className="admin-field">
            <span>Текст для подростка</span>
            <textarea
              className="admin-textarea"
              value={currentNode.prompt}
              onChange={(e) => updateNode({ prompt: e.target.value })}
              rows={5}
              placeholder="Что увидит подросток на этом экране"
            />
          </label>

          <div className="admin-preview-teen">
            <div className="admin-preview-teen__label">Так это выглядит в квесте</div>
            <div className="admin-preview-teen__text">
              {currentNode.prompt.trim() || "— пока пусто —"}
            </div>
          </div>

          <h4 className="admin-editor-section__title" style={{ marginTop: 20 }}>
            Варианты ответа
          </h4>
          <p className="admin-toolbar__hint" style={{ margin: "0 0 12px" }}>
            Каждый вариант — отдельная кнопка под текстом. Обычно достаточно одной или двух.
          </p>

          {currentNode.options.map((opt, idx) => {
            const { hours, minutes } = delayMsToHoursMinutes(opt.delayMs);
            const endsHere = Boolean(opt.terminal || !opt.nextNodeId);
            const effectsHint = normalizeSpendEffects(opt.effects);
            const patchOption = (patch: Partial<typeof opt>) => {
              const options = [...currentNode.options];
              options[idx] = { ...opt, ...patch };
              updateNode({ options });
            };
            return (
              <div key={`${opt.id}-${idx}`} className="admin-option-block">
                <div className="admin-option-block__head">
                  <span>Вариант {idx + 1}{opt.label ? `: «${opt.label}»` : ""}</span>
                  <button
                    type="button"
                    className="admin-btn--ghost admin-btn--sm"
                    disabled={currentNode.options.length <= 1}
                    title={
                      currentNode.options.length <= 1
                        ? "На экране должна остаться хотя бы одна кнопка"
                        : undefined
                    }
                    onClick={() => onRemoveOption(idx)}
                  >
                    Убрать вариант
                  </button>
                </div>

                <label className="admin-field">
                  <span>Надпись на кнопке</span>
                  <input
                    className="admin-input"
                    value={opt.label}
                    onChange={(e) => patchOption({ label: e.target.value })}
                  />
                </label>

                <OptionBudgetEditor
                  option={opt}
                  optionIndex={idx}
                  nodeIds={nodeIds}
                  scenario={scenario}
                  onChange={patchOption}
                />

                <label
                  className="admin-field admin-field--checkbox"
                  style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
                >
                  <input
                    type="checkbox"
                    checked={endsHere}
                    onChange={(e) => {
                      const options = [...currentNode.options];
                      if (e.target.checked) {
                        options[idx] = {
                          ...opt,
                          terminal: true,
                          nextNodeId: undefined,
                          delayMs: undefined,
                        };
                      } else {
                        options[idx] = {
                          ...opt,
                          terminal: false,
                          nextNodeId: opt.nextNodeId ?? nodeIds[0],
                        };
                      }
                      updateNode({ options });
                    }}
                  />
                  <span>
                    <strong>Квест заканчивается</strong> после этой кнопки (дальше экранов нет)
                  </span>
                </label>

                {!endsHere ? (
                  <>
                    <label className="admin-field">
                      <span>Какой экран показать дальше</span>
                      <select
                        className="admin-select"
                        value={opt.nextNodeId ?? ""}
                        onChange={(e) => {
                          const options = [...currentNode.options];
                          options[idx] = {
                            ...opt,
                            nextNodeId: e.target.value || undefined,
                            terminal: false,
                          };
                          updateNode({ options });
                        }}
                      >
                        <option value="">— выбери экран —</option>
                        {nodeIds.map((id, i) => (
                          <option key={id} value={id}>
                            {nodeDisplayName(id, scenario.nodes[id]?.prompt, i)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="admin-field">
                      <span>Через сколько показать следующий экран</span>
                      <p className="admin-toolbar__hint" style={{ margin: "0 0 8px" }}>
                        0 ч и 0 мин — сразу после нажатия. Иначе подросток ждёт и получит
                        напоминание в Telegram.
                      </p>
                      <div className="admin-form-row">
                        <label className="admin-field">
                          <span>Часы</span>
                          <input
                            className="admin-input"
                            type="number"
                            min={0}
                            value={hours}
                            onChange={(e) => {
                              const options = [...currentNode.options];
                              options[idx] = {
                                ...opt,
                                delayMs: hoursMinutesToDelayMs(Number(e.target.value), minutes),
                              };
                              updateNode({ options });
                            }}
                          />
                        </label>
                        <label className="admin-field">
                          <span>Минуты</span>
                          <input
                            className="admin-input"
                            type="number"
                            min={0}
                            max={59}
                            value={minutes}
                            onChange={(e) => {
                              const options = [...currentNode.options];
                              options[idx] = {
                                ...opt,
                                delayMs: hoursMinutesToDelayMs(hours, Number(e.target.value)),
                              };
                              updateNode({ options });
                            }}
                          />
                        </label>
                      </div>
                      <p className="admin-outcome-hint">
                        {optionOutcomeHint(
                          endsHere,
                          opt.delayMs,
                          opt.nextNodeId,
                          scenario,
                          effectsHint,
                        )}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="admin-outcome-hint">
                    {optionOutcomeHint(true, undefined, undefined, scenario, effectsHint)}
                  </p>
                )}

                <details className="admin-details">
                  <summary>Техническое: id кнопки для системы</summary>
                  <label className="admin-field" style={{ marginTop: 8 }}>
                    <input
                      className="admin-input"
                      value={opt.id}
                      onChange={(e) => {
                        const options = [...currentNode.options];
                        options[idx] = { ...opt, id: e.target.value };
                        updateNode({ options });
                      }}
                    />
                  </label>
                </details>
              </div>
            );
          })}

          <button
            type="button"
            className="admin-btn admin-btn--sm"
            onClick={() =>
              updateNode({
                options: [
                  ...currentNode.options,
                  { id: `opt_${currentNode.options.length + 1}`, label: "Новый ответ" },
                ],
              })
            }
          >
            + ещё одна кнопка на этом экране
          </button>
        </section>
      ) : null}

      <div className="admin-editor-footer">
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={busy}
          onClick={onSave}
        >
          Сохранить сценарий
        </button>
      </div>
    </div>
  );
}
