import React from "react";
import ReactDOM from "react-dom/client";
import "./ui/styles.css";

async function loadRootComponent() {
  if (import.meta.env.DEV && window.location.pathname === "/activate") {
    return (await import("./ui/ActivateTxline")).ActivateTxline;
  }
  return (await import("./ui/App")).App;
}

void loadRootComponent().then((RootComponent) => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <RootComponent />
    </React.StrictMode>,
  );
});
