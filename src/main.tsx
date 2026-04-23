import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// QA-mode diagnostic styles. Inert unless `data-qa-mode="on"` is set on
// <html> by `<UiQaMode />` (see src/components/qa/UiQaMode.tsx).
import "./styles/qa-mode.css";

createRoot(document.getElementById("root")!).render(<App />);
