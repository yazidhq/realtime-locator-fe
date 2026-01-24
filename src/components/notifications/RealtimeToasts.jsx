import { useMemo } from "react";
import { X } from "lucide-react";
import { useRealtime } from "../../context/realtime/realtimeContext";

const variantToBorder = (v) => {
  const variant = String(v || "").toLowerCase();
  if (variant === "primary") return "#1e3a5f";
  if (variant === "success") return "#16a34a";
  if (variant === "danger") return "#dc2626";
  if (variant === "warning") return "#f59e0b";
  return "#64748b";
};

const RealtimeToasts = () => {
  const { toasts, removeToast } = useRealtime();

  const list = useMemo(() => (Array.isArray(toasts) ? toasts : []), [toasts]);
  if (list.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 16,
        transform: "translateX(-50%)",
        zIndex: 99999,
        width: "min(520px, calc(100vw - 28px))",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {list.map((t) => {
        const border = variantToBorder(t?.variant);
        return (
          <div
            key={t.id}
            className="admin-card"
            style={{
              borderLeft: `6px solid ${border}`,
              padding: 12,
            }}
            role="status"
            aria-live="polite"
          >
            <div className="d-flex align-items-start justify-content-between gap-2">
              <div style={{ minWidth: 0 }}>
                <div className="fw-semibold" style={{ color: "#0b1b2a" }}>
                  {t.title}
                </div>
                <div className="text-muted" style={{ fontSize: "0.95rem", whiteSpace: "pre-wrap" }}>
                  {t.message}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-light"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss"
                title="Dismiss"
                style={{ flex: "0 0 auto" }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RealtimeToasts;
