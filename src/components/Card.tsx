import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`card-glow rounded-xl border border-[#2d2640] bg-[#13111a]/70 p-5 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="stat-glow card-glow rounded-xl border border-[#2d2640] bg-[#13111a]/70 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#9892a6]">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-[#6b6480]">{sub}</p>}
        </div>
        {icon && (
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
