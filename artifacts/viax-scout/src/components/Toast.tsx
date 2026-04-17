import React, { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "error" | "success";
  onClose: () => void;
}

export default function Toast({ message, type = "error", onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const isError = type === "error";

  return (
    <div
      className="animate-slide-in"
      style={{
        position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 1rem)", right: "1rem",
        background: isError ? "#2a1410" : "#0d2018",
        border: `1px solid ${isError ? "rgba(212,82,26,0.4)" : "rgba(26,122,74,0.4)"}`,
        color: isError ? "#f4a58a" : "#86efac",
        padding: "0.85rem 1.25rem",
        borderRadius: 8, fontSize: "0.8rem",
        boxShadow: "0 12px 40px rgba(0,0,0,0.09)",
        width: "min(calc(100vw - 2rem), 340px)", zIndex: 9999,
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.6, fontSize: "1rem" }}
      >
        ×
      </button>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const showToast = (message: string, type: "error" | "success" = "error") => {
    setToast({ message, type });
  };

  const hideToast = () => setToast(null);

  const ToastComponent = toast ? (
    <Toast message={toast.message} type={toast.type} onClose={hideToast} />
  ) : null;

  return { showToast, ToastComponent };
}
