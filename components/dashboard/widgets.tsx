import type { ReactNode } from "react";

export function MetricCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </article>
  );
}

export function StatusRow({ icon, label, value, active }: { icon: ReactNode; label: string; value: string; active: boolean }) {
  return (
    <div className="status-row">
      <span className="status-icon">{icon}</span>
      <strong>{label}</strong>
      <small className={active ? "active" : ""}>{value}</small>
    </div>
  );
}
