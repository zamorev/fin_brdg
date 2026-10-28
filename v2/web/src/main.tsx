import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SessionProvider } from "./session/SessionProvider";
import { TwaProvider } from "./twa/TwaProvider";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TwaProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </TwaProvider>
  </StrictMode>,
);
