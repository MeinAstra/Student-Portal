import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
if (import.meta.env.MODE === "pages") {
  import("./static/StaticApp.js").then(({ StaticApp }) => root.render(<StrictMode><HashRouter><StaticApp /></HashRouter></StrictMode>));
} else {
  import("./App.js").then(({ App }) => root.render(<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>));
}
