import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "./AdminApp";
import "../styles/global.css";
import "./admin.css";

document.body.classList.add("admin-cms");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
