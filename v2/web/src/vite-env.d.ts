/// <reference types="vite/client" />

declare const __APP_BUILD_ID__: string;

interface ImportMetaEnv {
  /** Только dev: «id:Имя» — вход за пользователя без Telegram (эмулятор с AUTH_SKIP=1). */
  readonly VITE_DEV_TG_USER?: string;
}
