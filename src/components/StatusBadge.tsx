export function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-zinc-500/15 text-zinc-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-400" : "bg-zinc-500"
        }`}
      />
      {label ?? (active ? "Active" : "Inactive")}
    </span>
  );
}

export function ApprovalBadge({ state }: { state?: string }) {
  const colors: Record<string, string> = {
    Approved: "bg-emerald-500/15 text-emerald-400",
    Pending: "bg-amber-500/15 text-amber-400",
    Rejected: "bg-red-500/15 text-red-400",
    NotSubmitted: "bg-zinc-500/15 text-zinc-400",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        colors[state ?? "NotSubmitted"] ?? colors.NotSubmitted
      }`}
    >
      {state ?? "Not Submitted"}
    </span>
  );
}
