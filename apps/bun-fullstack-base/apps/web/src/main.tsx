import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { createQueryClient } from "@web/lib/api.ts";
import { Home } from "@web/pages/Home.tsx";

import "@web/styles/fonts.css";
import "@web/styles/global.css";

const container = document.getElementById("root");
if (!container) throw new Error('Missing <div id="root"> in web/index.html');

/**
 * In dev, Bun reruns this file when it changes: the root is kept in `import.meta.hot.data`, so the app renders into
 * the same root instead of mounting React twice. In production `import.meta.hot` is undefined.
 */
let root: Root;
if (import.meta.hot) root = import.meta.hot.data.root ??= createRoot(container);
else root = createRoot(container);

root.render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
