import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

// Silence the benign "ResizeObserver loop completed with undelivered notifications"
// warning that Recharts triggers and that the webpack-dev-server overlay treats
// as a fatal error (blocking pointer events).
const resizeObserverErrHandler = (e) => {
  if (
    e.message &&
    (e.message.includes("ResizeObserver loop completed") ||
      e.message.includes("ResizeObserver loop limit exceeded"))
  ) {
    e.stopImmediatePropagation();
  }
};
window.addEventListener("error", resizeObserverErrHandler);
window.addEventListener("unhandledrejection", resizeObserverErrHandler);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
