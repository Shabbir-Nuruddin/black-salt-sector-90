import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/mukta/400.css";
import "@fontsource/mukta/500.css";
import "@fontsource/mukta/600.css";
import "@fontsource/mukta/700.css";
import "./index.css";
import { SITE } from "./content";
import App from "./App";

const t = SITE.theme;
const root = document.documentElement.style;
const vars: Record<string, string> = {
  "--bg": t.bg,
  "--bg2": t.bg2,
  "--panel": t.panel,
  "--line": t.line,
  "--ink": t.ink,
  "--ink2": t.ink2,
  "--ink3": t.ink3,
  "--accent": t.accent,
  "--on-accent": t.onAccent,
  "--display": `"${t.display}"`,
  "--display-weight": String(t.weight),
  "--display-case": t.upper ? "uppercase" : "none",
};
for (const k in vars) root.setProperty(k, vars[k]);
document.documentElement.style.colorScheme = t.dark ? "dark" : "light";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
