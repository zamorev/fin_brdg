import { useCallback, useEffect, useState } from "react";
import {
  createAdminScenario,
  deleteAdminScenario,
  deleteAdminScenarioNode,
  fetchAdminScenario,
  fetchAdminScenarios,
  saveAdminScenario,
  type ScenarioDefinition,
  type ScenarioListItem,
} from "../api/adminClient";
import { NODE_ID_HINT } from "./scenarioUiHelpers";
import { ScenarioEditor } from "./ScenarioEditor";

type Props = {
  onError: (msg: string | null) => void;
};

function sourceLabel(item: ScenarioListItem): { text: string; className: string } {
  if (item.source === "git") {
    return { text: "Код + CMS", className: "admin-badge admin-badge--code" };
  }
  return { text: "CMS", className: "admin-badge admin-badge--cms" };
}

export function ScenariosPanel({ onError }: Props) {
  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scenario, setScenario] = useState<ScenarioDefinition | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newScenarioId, setNewScenarioId] = useState("");
  const [newScenarioTitle, setNewScenarioTitle] = useState("");

  const loadScenarios = useCallback(async () => {
    const res = await fetchAdminScenarios();
    setScenarios(res.scenarios);
  }, []);

  useEffect(() => {
    void loadScenarios()
      .catch((e) => onError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [loadScenarios, onError]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setScenario(null);
    setNodeId(null);
  };

  const openScenario = async (id: string) => {
    setBusy(true);
    onError(null);
    try {
      const res = await fetchAdminScenario(id);
      setScenario(res.scenario);
      setNodeId(res.scenario.startNodeId);
      setDrawerOpen(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const saveScenario = async () => {
    if (!scenario) return;
    setBusy(true);
    onError(null);
    try {
      const res = await saveAdminScenario(scenario);
      if (res.warnings?.length) {
        onError(res.warnings.join("; "));
      }
      await loadScenarios();
      const fresh = await fetchAdminScenario(scenario.id);
      setScenario(fresh.scenario);
      setNodeId((prev) => prev ?? fresh.scenario.startNodeId);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const addNode = () => {
    if (!scenario) return;
    const id = `node_${Object.keys(scenario.nodes).length + 1}`;
    setScenario({
      ...scenario,
      nodes: {
        ...scenario.nodes,
        [id]: {
          id,
          prompt: "Новый шаг",
          options: [{ id: "opt_1", label: "Новый ответ" }],
        },
      },
    });
    setNodeId(id);
  };

  const removeOption = (idx: number) => {
    if (!scenario || !nodeId) return;
    const currentNode = scenario.nodes[nodeId];
    if (!currentNode || currentNode.options.length <= 1) {
      onError("На шаге должен остаться хотя бы один вариант ответа");
      return;
    }
    const label = currentNode.options[idx]?.label || `Ответ ${idx + 1}`;
    if (!window.confirm(`Удалить вариант «${label}»?`)) return;
    onError(null);
    setScenario({
      ...scenario,
      nodes: {
        ...scenario.nodes,
        [nodeId]: {
          ...currentNode,
          options: currentNode.options.filter((_, i) => i !== idx),
        },
      },
    });
  };

  const removeCurrentNode = async () => {
    if (!scenario || !nodeId) return;
    const name = NODE_ID_HINT[nodeId] ?? nodeId;
    if (!window.confirm(`Удалить шаг «${name}»? Это сохранится сразу.`)) return;
    setBusy(true);
    onError(null);
    try {
      const res = await deleteAdminScenarioNode(scenario.id, nodeId);
      setScenario(res.scenario);
      setNodeId(res.scenario.startNodeId);
      if (res.warnings?.length) {
        onError(res.warnings.join("; "));
      }
      await loadScenarios();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError(null);
    try {
      const res = await createAdminScenario(newScenarioId, newScenarioTitle);
      setNewScenarioId("");
      setNewScenarioTitle("");
      setCreateOpen(false);
      await loadScenarios();
      setScenario(res.scenario);
      setNodeId(res.scenario.startNodeId);
      setDrawerOpen(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const removeScenario = async (item: ScenarioListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const msg =
      item.id === "cinema_chain_v1"
        ? `Сбросить правки CMS для «${item.title}»? Останется версия из кода.`
        : `Удалить сценарий «${item.title}» (${item.id})? Это необратимо.`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    onError(null);
    try {
      await deleteAdminScenario(item.id);
      if (scenario?.id === item.id) {
        closeDrawer();
      }
      await loadScenarios();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-toolbar__title">Сценарии квестов</h2>
          <p className="admin-toolbar__hint">Клик по строке или «Открыть» — редактирование справа</p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={busy}
          onClick={() => {
            setCreateOpen(true);
            onError(null);
          }}
        >
          Добавить
        </button>
      </div>

      <div className="admin-card admin-table-wrap admin-scenarios-table">
        {loading ? (
          <div className="admin-empty">Загрузка…</div>
        ) : scenarios.length === 0 ? (
          <div className="admin-empty">
            Сценариев пока нет. Нажми «Добавить», чтобы создать первый.
          </div>
        ) : (
          <table className="admin-table">
            <colgroup>
              <col className="col-name" />
              <col className="col-id" />
              <col className="col-ver" />
              <col className="col-src" />
              <col className="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Название</th>
                <th>ID</th>
                <th>Версия</th>
                <th>Источник</th>
                <th style={{ width: 1 }} aria-label="Действия" />
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => {
                const src = sourceLabel(s);
                const canDelete = s.source !== "git";
                return (
                  <tr
                    key={s.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => void openScenario(s.id)}
                  >
                    <td>
                      <div className="admin-table__name">{s.title}</div>
                    </td>
                    <td>
                      <code className="admin-table__id">{s.id}</code>
                    </td>
                    <td>v{s.version}</td>
                    <td>
                      <span className={src.className}>{src.text}</span>
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void openScenario(s.id);
                          }}
                        >
                          Открыть
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger admin-btn--sm"
                          disabled={busy || !canDelete}
                          title={
                            !canDelete
                              ? "Только встроенный сценарий из кода — удаление недоступно"
                              : s.id === "cinema_chain_v1"
                                ? "Сбросить правки CMS"
                                : "Удалить из CMS"
                          }
                          onClick={(e) => void removeScenario(s, e)}
                        >
                          {s.id === "cinema_chain_v1" && canDelete ? "Сброс CMS" : "Удалить"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {createOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={() => !busy && setCreateOpen(false)}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-labelledby="admin-create-scenario-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="admin-create-scenario-title" className="admin-modal__title">
              Новый сценарий
            </h3>
            <form onSubmit={(e) => void submitCreate(e)}>
              <label className="admin-field">
                <span>ID (латиница, например cafe_v1)</span>
                <input
                  className="admin-input"
                  value={newScenarioId}
                  onChange={(e) => setNewScenarioId(e.target.value)}
                  autoFocus
                  required
                />
              </label>
              <label className="admin-field">
                <span>Название</span>
                <input
                  className="admin-input"
                  value={newScenarioTitle}
                  onChange={(e) => setNewScenarioTitle(e.target.value)}
                  placeholder="Кафе с друзьями"
                />
              </label>
              <div className="admin-modal__actions">
                <button
                  type="button"
                  className="admin-btn"
                  disabled={busy}
                  onClick={() => setCreateOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={busy || !newScenarioId.trim()}
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {drawerOpen && scenario ? (
        <>
          <button
            type="button"
            className="admin-drawer-backdrop"
            aria-label="Закрыть"
            onClick={() => closeDrawer()}
          />
          <aside className="admin-drawer" aria-label="Редактор сценария">
            <div className="admin-drawer__head">
              <div>
                <h3 className="admin-drawer__title">{scenario.title || "Сценарий"}</h3>
                <p className="admin-drawer__sub">{scenario.id}</p>
              </div>
              <div className="admin-drawer__head-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--sm"
                  disabled={busy}
                  onClick={() => void saveScenario()}
                >
                  Сохранить
                </button>
                <button type="button" className="admin-btn admin-btn--sm" onClick={closeDrawer}>
                  Закрыть
                </button>
              </div>
            </div>
            <div className="admin-drawer__body">
              <ScenarioEditor
                scenario={scenario}
                nodeId={nodeId}
                busy={busy}
                onScenarioChange={setScenario}
                onNodeIdChange={setNodeId}
                onAddNode={addNode}
                onRemoveNode={() => void removeCurrentNode()}
                onRemoveOption={removeOption}
                onSave={() => void saveScenario()}
              />
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
