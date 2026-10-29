import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminLogin,
  adminLogout,
  adminMe,
  adminSeed,
  fetchAdminMessages,
  saveAdminMessage,
  setAdminToken,
  type AdminMessageRow,
} from "../api/adminClient";
import { ScenariosPanel } from "./ScenariosPanel";

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
  const [busy, setBusy] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    if (tab === "messages") {
      void loadMessages().catch((e) =>
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

  if (!user) {
    return (
      <div className="admin-login-wrap">
        <div className="admin-login">
          <h1 className="screen-title">Fin Bridge CMS</h1>
          <p className="screen-sub">Тестовая админка контента</p>
          {error ? <p className="admin-alert">{error}</p> : null}
          <form onSubmit={(e) => void onLogin(e)} className="admin-card">
          <label className="admin-field">
            <span>Логин</span>
            <input
              className="admin-input"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="admin-field">
            <span>Пароль</span>
            <input
              className="admin-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
            Войти
          </button>
        </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-root">
      <div className="admin-root__inner">
      <header className="admin-header">
        <div>
          <h1 className="screen-title">Fin Bridge CMS</h1>
          <p className="screen-sub" style={{ margin: 0 }}>
            {user}
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn--sm" onClick={() => void onLogout()}>
          Выйти
        </button>
      </header>

      <nav className="admin-tabs">
        <button
          type="button"
          className={`admin-tab${tab === "messages" ? " admin-tab--active" : ""}`}
          onClick={() => setTab("messages")}
        >
          Сообщения
        </button>
        <button
          type="button"
          className={`admin-tab${tab === "scenarios" ? " admin-tab--active" : ""}`}
          onClick={() => setTab("scenarios")}
        >
          Сценарии
        </button>
        <button
          type="button"
          className="admin-tab-ghost"
          title="Один раз: скопировать тексты и сценарий «кино» из кода в Firestore, если база пустая"
          onClick={() =>
            void adminSeed()
              .then(() => {
                if (tab === "messages") return loadMessages();
              })
              .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
          }
        >
          Заполнить из шаблона
        </button>
      </nav>

      {error ? (
        <p className="admin-alert" role="status">
          {error}
        </p>
      ) : null}

      {tab === "messages" ? (
        <div className="admin-messages">
          <div className="admin-card admin-messages__groups">
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                className={`admin-btn admin-btn--ghost${msgGroup === g ? " admin-btn--active" : ""}`}
                onClick={() => setMsgGroup(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="admin-card admin-messages__list">
            {filteredMessages.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`admin-messages__list-item${selectedKey === m.key ? " admin-messages__list-item--active" : ""}`}
                onClick={() => selectMessage(m)}
              >
                <div className="task-title">{m.label}</div>
                <div className="task-sub">{m.key}</div>
              </button>
            ))}
          </div>
          <div className="admin-card admin-messages__editor">
            <textarea
              className="admin-textarea"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
            <div className="admin-messages__editor-actions">
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={busy || !selectedKey}
                onClick={() => void saveMessage()}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ScenariosPanel onError={setError} />
      )}
      </div>
    </div>
  );
}
