import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { AppStateProvider } from "./state/AppStateContext";
import { ToastProvider } from "./ui/Toast";

// App entry point. The state provider sits above the toasts and views so all of them can use it.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppStateProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AppStateProvider>
  </StrictMode>,
);
