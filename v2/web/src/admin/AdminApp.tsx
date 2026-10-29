import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminLogin,
  adminLogout,
  adminMe,
  adminSeed,
  createAdminScenario,
  deleteAdminScenario,
  deleteAdminScenarioNode,
  fetchAdminMessages,
  fetchAdminScenario,
  fetchAdminScenarios,
  saveAdminMessage,
  saveAdminScenario,
  setAdminToken,
  type AdminMessageRow,
  type ScenarioDefinition,
  type ScenarioListItem,
} from "../api/adminClient";
import {
  delayMsToHoursMinutes,
  formatDelayHuman,
  hoursMinutesToDelayMs,
  NODE_ID_HINT,
  nodeSummary,
} from "./scenarioUiHelpers";

type Tab = "messages" | "scenarios";

export function AdminApp() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("messages");
  const [messages, setMessages] = useState<AdminMessageRow[]>([]);
  const [msgGroup, setMsgGroup] = useState<string>("Bot");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([]);
  const [scenario, setScenario] = useState<ScenarioDefinition | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newScenarioId, setNewScenarioId] = useState("");
  const [newScenarioTitle, setNewScenarioTitle] = useState("");

  const loadSession = useCallback(async () => {
    try {
      const me = await adminMe();
      setUser(me.login);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const groups = useMemo(
    () => [...new Set(messages.map((m) => m.group))],
    [messages],
  );

  const filteredMessages = messages.filter((m) => m.group === msgGroup);

  const loadMessages = async () => {
    const res = await fetchAdminMessages();
    setMessages(res.messages);
    if (!selectedKey && res.messages.length) {
      const first = res.messages.find((m) => m.group === msgGroup) ?? res.messages[0];
      setSelectedKey(first.key);
      setDraftText(first.text);
    }
  };

  const loadScenarios = async () => {
    const res = await fetchAdminScenarios();
    setScenarios(res.scenarios);
  };

  useEffect(() => {
    if (!user) return;
    if (tab === "messages") {
      void loadMessages().catch((e) =>
        setError(e instanceof Error ? e.message : "Ошибка"),
      );
    }
    if (tab === "scenarios") {
      void loadScenarios().catch((e) =>
        setError(e instanceof Error ? e.message : "Ошибка"),
      );
    }
  }, [user, tab]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await adminLogin(login, password);
      setAdminToken(res.token);
      setUser(res.login);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    try {
      await adminLogout();
    } finally {
      setAdminToken(null);
      setUser(null);
    }
  };

  const selectMessage = (row: AdminMessageRow) => {
    setSelectedKey(row.key);
    setDraftText(row.text);
  };

  const saveMessage = async () => {
    if (!selectedKey) return;
    setBusy(true);
    setError(null);
    try {
      await saveAdminMessage(selectedKey, draftText);
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const openScenario = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetchAdminScenario(id);
      setScenario(res.scenario);
      const firstNode = res.scenario.startNodeId;
      setNodeId(firstNode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const saveScenario = async () => {
    if (!scenario) return;
    setBusy(true);
    setError(null);
    try {
      const res = await saveAdminScenario(scenario);
      if (res.warnings?.length) {
        setError(res.warnings.join("; "));
      }
      await loadScenarios();
      await openScenario(scenario.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const currentNode = scenario && nodeId ? scenario.nodes[nodeId] : null;

  const updateNode = (patch: Partial<ScenarioDefinition["nodes"][string]>) => {
    if (!scenario || !nodeId) return;
    setScenario({
      ...scenario,
      nodes: {
        ...scenario.nodes,
        [nodeId]: { ...scenario.nodes[nodeId], ...patch, id: nodeId },
      },
    });
  };

  const addNode = () => {
    if (!scenario) return;
    const id = `node_${Object.keys(scenario.nodes).length + 1}`;
    setScenario({
      ...scenario,
      nodes: {
        ...scenario.nodes,
        [id]: { id, prompt: "Новый шаг", options: [{ id: "opt_1", label: "Новый ответ" }] },
      },
    });
    setNodeId(id);
  };

  const removeOption = (idx: number) => {
    if (!scenario || !nodeId || !currentNode) return;
    if (currentNode.options.length <= 1) {
      setError("На шаге должен остаться хотя бы один вариант ответа");
      return;
    }
    const label = currentNode.options[idx]?.label || `Ответ ${idx + 1}`;
    if (!window.confirm(`Удалить вариант «${label}»?`)) return;
    setError(null);
    updateNode({
      options: currentNode.options.filter((_, i) => i !== idx),
    });
  };

  const removeCurrentNode = async () => {
    if (!scenario || !nodeId) return;
    const name = NODE_ID_HINT[nodeId] ?? nodeId;
    if (!window.confirm(`Удалить шаг «${name}»? Это сохранится сразу.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await deleteAdminScenarioNode(scenario.id, nodeId);
      setScenario(res.scenario);
      setNodeId(res.scenario.startNodeId);
      if (res.warnings?.length) {
        setError(res.warnings.join("; "));
      }
      await loadScenarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const createScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createAdminScenario(newScenarioId, newScenarioTitle);
      setNewScenarioId("");
      setNewScenarioTitle("");
      await loadScenarios();
      setScenario(res.scenario);
      setNodeId(res.scenario.startNodeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const removeScenario = async (item: ScenarioListItem) => {
    const msg =
      item.id === "cinema_chain_v1"
        ? `Сбросить правки CMS для «${item.title}»? Останется версия из кода.`
        : `Удалить сценарий «${item.title}» (${item.id})? Это необратимо.`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAdminScenario(item.id);
      if (scenario?.id === item.id) {
        setScenario(null);
        setNodeId(null);
      }
      await loadScenarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="app-shell" style={{ maxWidth: 420, margin: "40px auto" }}>
        <h1 className="screen-title">Fin Bridge CMS</h1>
        <p className="screen-sub">Тестовая админка контента</p>
        {error ? <p style={{ color: "#f87171" }}>{error}</p> : null}
        <form onSubmit={(e) => void onLogin(e)} className="card" style={{ display: "grid", gap: 12 }}>
          <label>
            Логин
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <button type="submit" className="btn-primary-fallback" disabled={busy}>
            Войти
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 48 }}>
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="screen-title" style={{ marginBottom: 4 }}>
            Fin Bridge CMS
          </h1>
          <p className="screen-sub">{user}</p>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          style={{
            fontSize: "0.875rem",
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid rgb(255 255 255 / 0.2)",
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          Выйти
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setTab("messages")}
          style={{
            fontSize: "0.875rem",
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid rgb(255 255 255 / 0.15)",
            background: tab === "messages" ? "var(--fb-accent)" : "transparent",
            color: "inherit",
            cursor: "pointer",
            opacity: tab === "messages" ? 1 : 0.75,
          }}
        >
          Сообщения
        </button>
        <button
          type="button"
          onClick={() => setTab("scenarios")}
          style={{
            fontSize: "0.875rem",
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid rgb(255 255 255 / 0.15)",
            background: tab === "scenarios" ? "var(--fb-accent)" : "transparent",
            color: "inherit",
            cursor: "pointer",
            opacity: tab === "scenarios" ? 1 : 0.75,
          }}
        >
          Сценарии
        </button>
        <button
          type="button"
          title="Один раз: скопировать тексты и сценарий «кино» из кода в Firestore, если база пустая"
          style={{ marginLeft: "auto", fontSize: "0.8125rem", opacity: 0.85 }}
          onClick={() =>
            void adminSeed()
              .then(() => loadMessages())
              .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
          }
        >
          Заполнить из шаблона
        </button>
      </div>

      {error ? (
        <p style={{ color: "#fbbf24", marginBottom: 12 }} role="status">
          {error}
        </p>
      ) : null}

      {tab === "messages" ? (
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  opacity: msgGroup === g ? 1 : 0.7,
                }}
                onClick={() => setMsgGroup(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="card" style={{ maxHeight: 480, overflow: "auto" }}>
            {filteredMessages.map((m) => (
              <button
                key={m.key}
                type="button"
                className="task-row"
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => selectMessage(m)}
              >
                <span>
                  <div className="task-title">{m.label}</div>
                  <div className="task-sub">{m.key}</div>
                </span>
              </button>
            ))}
          </div>
          <div className="card">
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={12}
              style={{ width: "100%", fontFamily: "inherit" }}
            />
            <button
              type="button"
              className="btn-primary-fallback"
              style={{ marginTop: 12 }}
              disabled={busy || !selectedKey}
              onClick={() => void saveMessage()}
            >
              Сохранить
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
          <div className="card" style={{ display: "grid", gap: 10 }}>
            <form onSubmit={(e) => void createScenario(e)} style={{ display: "grid", gap: 8 }}>
              <div className="screen-sub" style={{ margin: 0, fontWeight: 600 }}>
                Новый сценарий
              </div>
              <input
                placeholder="id, например cafe_v1"
                value={newScenarioId}
                onChange={(e) => setNewScenarioId(e.target.value)}
                style={{ width: "100%" }}
              />
              <input
                placeholder="Название"
                value={newScenarioTitle}
                onChange={(e) => setNewScenarioTitle(e.target.value)}
                style={{ width: "100%" }}
              />
              <button type="submit" disabled={busy || !newScenarioId.trim()} style={{ fontSize: "0.8125rem" }}>
                Создать
              </button>
            </form>
            <div className="screen-sub" style={{ margin: "8px 0 0", borderTop: "1px solid rgb(255 255 255 / 0.08)", paddingTop: 8 }}>
              В списке
            </div>
            {scenarios.map((s) => (
              <div key={s.id} className="task-row" style={{ display: "flex", gap: 4, alignItems: "stretch" }}>
                <button
                  type="button"
                  className="task-row"
                  style={{ flex: 1, minWidth: 0 }}
                  onClick={() => void openScenario(s.id)}
                >
                  <span>
                    <div className="task-title">{s.title}</div>
                    <div className="task-sub">
                      {s.id} · v{s.version} ·{" "}
                      {s.source === "git" ? "код + CMS" : "только CMS"}
                    </div>
                  </span>
                </button>
                <button
                  type="button"
                  title={
                    s.source === "git"
                      ? "Нет копии в CMS — только встроенный сценарий из кода"
                      : s.id === "cinema_chain_v1"
                        ? "Удалить правки CMS (вернётся версия из кода)"
                        : "Удалить сценарий из CMS"
                  }
                  disabled={busy || s.source === "git"}
                  onClick={() => void removeScenario(s)}
                  style={{
                    flexShrink: 0,
                    fontSize: "0.75rem",
                    color: "#f87171",
                    background: "transparent",
                    border: "1px solid rgb(248 113 113 / 0.35)",
                    borderRadius: 8,
                    padding: "0 8px",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {scenario ? (
            <div className="card" style={{ display: "grid", gap: 12 }}>
              <p className="screen-sub" style={{ margin: 0, lineHeight: 1.5 }}>
                Сценарий — цепочка шагов. У каждого шага текст и кнопки ответа. После ответа
                подросток либо переходит на следующий шаг (можно с паузой), либо сценарий
                заканчивается.
              </p>
              <label>
                Название квеста
                <input
                  value={scenario.title}
                  onChange={(e) => setScenario({ ...scenario, title: e.target.value })}
                  style={{ width: "100%", marginTop: 4 }}
                />
              </label>
              <label>
                С какого шага начинать
                <select
                  value={scenario.startNodeId}
                  onChange={(e) => setScenario({ ...scenario, startNodeId: e.target.value })}
                  style={{ width: "100%", marginTop: 4 }}
                >
                  {Object.keys(scenario.nodes).map((id) => (
                    <option key={id} value={id}>
                      {NODE_ID_HINT[id] ?? nodeSummary(id, scenario.nodes[id]?.prompt)}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <div className="screen-sub" style={{ marginBottom: 6 }}>
                  Шаги сценария
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.keys(scenario.nodes).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setNodeId(id)}
                    title={scenario.nodes[id]?.prompt}
                    style={{
                      opacity: nodeId === id ? 1 : 0.65,
                      fontSize: "0.8125rem",
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid rgb(255 255 255 / 0.12)",
                      background: nodeId === id ? "rgb(255 255 255 / 0.08)" : "transparent",
                    }}
                  >
                    {NODE_ID_HINT[id] ?? id}
                  </button>
                ))}
                <button type="button" onClick={addNode} style={{ fontSize: "0.8125rem" }}>
                  + шаг
                </button>
                </div>
              </div>
              {currentNode ? (
                <>
                  <div className="row-between" style={{ alignItems: "center" }}>
                    <span className="screen-sub" style={{ margin: 0 }}>
                      Редактируешь: {NODE_ID_HINT[nodeId!] ?? nodeId}
                    </span>
                    <button
                      type="button"
                      disabled={busy || scenario.startNodeId === nodeId}
                      title={
                        scenario.startNodeId === nodeId
                          ? "Сначала выбери другой стартовый шаг"
                          : undefined
                      }
                      onClick={() => void removeCurrentNode()}
                      style={{
                        fontSize: "0.8125rem",
                        color: "#f87171",
                        background: "transparent",
                        border: "1px solid rgb(248 113 113 / 0.35)",
                        borderRadius: 8,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Удалить шаг
                    </button>
                  </div>
                  <label>
                    Текст шага (что видит подросток)
                    <textarea
                      value={currentNode.prompt}
                      onChange={(e) => updateNode({ prompt: e.target.value })}
                      rows={5}
                      style={{ width: "100%", marginTop: 4 }}
                    />
                  </label>
                  <h3 style={{ fontSize: "1rem", margin: "4px 0" }}>Кнопки ответа</h3>
                  {currentNode.options.map((opt, idx) => {
                    const { hours, minutes } = delayMsToHoursMinutes(opt.delayMs);
                    const endsHere = Boolean(opt.terminal || !opt.nextNodeId);
                    return (
                    <div key={`${opt.id}-${idx}`} className="card" style={{ padding: 12 }}>
                      <div
                        className="row-between"
                        style={{ fontWeight: 600, marginBottom: 8, alignItems: "center" }}
                      >
                        <span>{opt.label || `Ответ ${idx + 1}`}</span>
                        <button
                          type="button"
                          disabled={currentNode.options.length <= 1}
                          title={
                            currentNode.options.length <= 1
                              ? "Нужен хотя бы один ответ"
                              : undefined
                          }
                          onClick={() => removeOption(idx)}
                          style={{
                            fontSize: "0.75rem",
                            color: "#f87171",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                      <div style={{ display: "grid", gap: 8, fontSize: "0.875rem" }}>
                        <label>
                          Текст на кнопке
                          <input
                            value={opt.label}
                            onChange={(e) => {
                              const options = [...currentNode.options];
                              options[idx] = { ...opt, label: e.target.value };
                              updateNode({ options });
                            }}
                            style={{ width: "100%", marginTop: 4 }}
                          />
                        </label>
                        <label style={{ color: "var(--fb-hint)", fontSize: "0.8125rem" }}>
                          Служебный id (не менять без нужды)
                          <input
                            value={opt.id}
                            onChange={(e) => {
                              const options = [...currentNode.options];
                              options[idx] = { ...opt, id: e.target.value };
                              updateNode({ options });
                            }}
                            style={{ width: "100%", marginTop: 4, opacity: 0.9 }}
                          />
                        </label>
                        <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
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
                                  nextNodeId:
                                    opt.nextNodeId ?? Object.keys(scenario.nodes)[0],
                                };
                              }
                              updateNode({ options });
                            }}
                          />
                          <span>
                            <strong>Завершить сценарий</strong> после этого ответа (дальше
                            шагов не будет)
                          </span>
                        </label>
                        {!endsHere ? (
                          <>
                            <label>
                              Следующий шаг
                              <select
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
                                style={{ width: "100%", marginTop: 4 }}
                              >
                                <option value="">— выбери шаг —</option>
                                {Object.keys(scenario.nodes).map((id) => (
                                  <option key={id} value={id}>
                                    {NODE_ID_HINT[id] ?? nodeSummary(id, scenario.nodes[id]?.prompt)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div>
                              <div style={{ marginBottom: 4 }}>Пауза перед следующим шагом</div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <label style={{ flex: 1 }}>
                                  Часы
                                  <input
                                    type="number"
                                    min={0}
                                    value={hours}
                                    onChange={(e) => {
                                      const options = [...currentNode.options];
                                      options[idx] = {
                                        ...opt,
                                        delayMs: hoursMinutesToDelayMs(
                                          Number(e.target.value),
                                          minutes,
                                        ),
                                      };
                                      updateNode({ options });
                                    }}
                                    style={{ width: "100%", marginTop: 4 }}
                                  />
                                </label>
                                <label style={{ flex: 1 }}>
                                  Минуты
                                  <input
                                    type="number"
                                    min={0}
                                    max={59}
                                    value={minutes}
                                    onChange={(e) => {
                                      const options = [...currentNode.options];
                                      options[idx] = {
                                        ...opt,
                                        delayMs: hoursMinutesToDelayMs(
                                          hours,
                                          Number(e.target.value),
                                        ),
                                      };
                                      updateNode({ options });
                                    }}
                                    style={{ width: "100%", marginTop: 4 }}
                                  />
                                </label>
                              </div>
                              <div className="screen-sub" style={{ marginTop: 4 }}>
                                Сейчас: {formatDelayHuman(opt.delayMs)} — подросток увидит
                                следующий шаг в приложении / в пуше бота после паузы.
                              </div>
                            </div>
                          </>
                        ) : null}
                        {(opt.effects?.length ?? 0) > 0 ? (
                          <p className="screen-sub" style={{ margin: 0 }}>
                            Списания с бюджета заданы в коде ({opt.effects!.length} поз.).{" "}
                            Редактор сумм — позже.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                  })}
                  <button
                    type="button"
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
                className="btn-primary-fallback"
                disabled={busy}
                onClick={() => void saveScenario()}
              >
                Сохранить сценарий
              </button>
            </div>
          ) : (
            <p className="screen-sub">Выбери сценарий слева</p>
          )}
        </div>
      )}
    </div>
  );
}
