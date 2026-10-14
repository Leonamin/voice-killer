import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "pretendard/dist/web/variable/pretendardvariable.css";
import "./ui/styles/tokens.css";
import "./ui/styles/global.css";
import "./ui/styles/basic.css";
import "./ui/styles/overlays.css";
import "./ui/styles/tabs.css";
import "./ui/styles/toast.css";
import "./ui/styles/composed.css";
import "./theme.css";
import "./app.css";
import { App } from "./App";

document.documentElement.dataset.colorMode = "dark";
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
