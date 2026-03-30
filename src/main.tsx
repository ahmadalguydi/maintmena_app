import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initStorage } from "./lib/storage.ts";

// Populate localStorage cache from @capacitor/preferences on native before
// the first render so all synchronous preference reads are accurate.
initStorage().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
