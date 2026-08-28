interface StatusBadgeProps {
  status: "scheduled" | "processing" | "delayed" | "sent" | "failed";
}

const statusConfig = {
  scheduled: { label: "Scheduled", className: "badge-scheduled" },
  processing: { label: "Processing", className: "badge-processing" },
  delayed: { label: "Delayed", className: "badge-delayed" },
  sent: { label: "Sent", className: "badge-sent" },
  failed: { label: "Failed", className: "badge-failed" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.scheduled;

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-1 rounded-full
        text-xs font-medium ${config.className}
      `}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75" />
      {config.label}
    </span>
  );
}
