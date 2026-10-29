import type { ScenarioDefinition } from "../api/adminClient";
import {
  delayMsToHoursMinutes,
  formatDelayHuman,
  hoursMinutesToDelayMs,
  NODE_ID_HINT,
  nodeSummary,
} from "./scenarioUiHelpers";

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
  const currentNode = nodeId ? scenario.nodes[nodeId] : null;

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
    <div style={{ display: "grid", gap: 16 }}>
      <p className="admin-toolbar__hint" style={{ margin: 0, lineHeight: 1.5 }}>
        Цепочка шагов: текст и кнопки ответа. После ответа — следующий шаг (с паузой) или
        конец сценария.
      </p>

      <label className="admin-field">
        <span>Название квеста</span>
        <input
          className="admin-input"
          value={scenario.title}
          onChange={(e) => onScenarioChange({ ...scenario, title: e.target.value })}
        />
      </label>

      <label className="admin-field">
        <span>Стартовый шаг</span>
        <select
          className="admin-select"
          value={scenario.startNodeId}
          onChange={(e) => onScenarioChange({ ...scenario, startNodeId: e.target.value })}
        >
          {Object.keys(scenario.nodes).map((id) => (
            <option key={id} value={id}>
              {NODE_ID_HINT[id] ?? nodeSummary(id, scenario.nodes[id]?.prompt)}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="admin-field" style={{ marginBottom: 6 }}>
          <span>Шаги</span>
        </span>
        <div className="admin-step-chips">
          {Object.keys(scenario.nodes).map((id) => (
            <button
              key={id}
              type="button"
              className={`admin-step-chip${nodeId === id ? " admin-step-chip--active" : ""}`}
              title={scenario.nodes[id]?.prompt}
              onClick={() => onNodeIdChange(id)}
            >
              {NODE_ID_HINT[id] ?? id}
            </button>
          ))}
          <button type="button" className="admin-btn admin-btn--sm" onClick={onAddNode}>
            + шаг
          </button>
        </div>
      </div>

      {currentNode && nodeId ? (
        <>
          <div className="admin-toolbar" style={{ marginBottom: 0 }}>
            <span className="admin-toolbar__hint" style={{ margin: 0 }}>
              Шаг: {NODE_ID_HINT[nodeId] ?? nodeId}
            </span>
            <button
              type="button"
              className="admin-btn admin-btn--danger admin-btn--sm"
              disabled={busy || scenario.startNodeId === nodeId}
              title={
                scenario.startNodeId === nodeId
                  ? "Сначала выбери другой стартовый шаг"
                  : undefined
              }
              onClick={onRemoveNode}
            >
              Удалить шаг
            </button>
          </div>

          <label className="admin-field">
            <span>Текст шага</span>
            <textarea
              className="admin-textarea"
              value={currentNode.prompt}
              onChange={(e) => updateNode({ prompt: e.target.value })}
              rows={5}
            />
          </label>

          <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Кнопки ответа</div>

          {currentNode.options.map((opt, idx) => {
            const { hours, minutes } = delayMsToHoursMinutes(opt.delayMs);
            const endsHere = Boolean(opt.terminal || !opt.nextNodeId);
            return (
              <div key={`${opt.id}-${idx}`} className="admin-option-block">
                <div className="admin-option-block__head">
                  <span>{opt.label || `Ответ ${idx + 1}`}</span>
                  <button
                    type="button"
                    className="admin-btn--ghost admin-btn--sm"
                    disabled={currentNode.options.length <= 1}
                    onClick={() => onRemoveOption(idx)}
                  >
                    Удалить
                  </button>
                </div>
                <label className="admin-field">
                  <span>Текст на кнопке</span>
                  <input
                    className="admin-input"
                    value={opt.label}
                    onChange={(e) => {
                      const options = [...currentNode.options];
                      options[idx] = { ...opt, label: e.target.value };
                      updateNode({ options });
                    }}
                  />
                </label>
                <label className="admin-field">
                  <span>Служебный id</span>
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
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.875rem" }}>
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
                          nextNodeId: opt.nextNodeId ?? Object.keys(scenario.nodes)[0],
                        };
                      }
                      updateNode({ options });
                    }}
                  />
                  <span>Завершить сценарий после этого ответа</span>
                </label>
                {!endsHere ? (
                  <>
                    <label className="admin-field">
                      <span>Следующий шаг</span>
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
                        <option value="">— выбери шаг —</option>
                        {Object.keys(scenario.nodes).map((id) => (
                          <option key={id} value={id}>
                            {NODE_ID_HINT[id] ?? nodeSummary(id, scenario.nodes[id]?.prompt)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="admin-field">
                      <span>Пауза перед следующим шагом</span>
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
                      <p className="admin-toolbar__hint" style={{ marginTop: 4 }}>
                        {formatDelayHuman(opt.delayMs)}
                      </p>
                    </div>
                  </>
                ) : null}
                {(opt.effects?.length ?? 0) > 0 ? (
                  <p className="admin-toolbar__hint" style={{ margin: 0 }}>
                    Списания с бюджета заданы в коде ({opt.effects!.length} поз.).
                  </p>
                ) : null}
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
            + кнопка ответа
          </button>
        </>
      ) : null}

      <button
        type="button"
        className="admin-btn admin-btn--primary"
        disabled={busy}
        onClick={onSave}
      >
        Сохранить сценарий
      </button>
    </div>
  );
}
