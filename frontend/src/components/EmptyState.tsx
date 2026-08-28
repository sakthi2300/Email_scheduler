import { ReactNode } from "react";
import { InboxIcon } from "@heroicons/react/24/outline";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-surface-800/50 border border-surface-700/50 flex items-center justify-center mb-4">
        {icon || <InboxIcon className="w-8 h-8 text-surface-500" />}
      </div>
      <h3 className="text-lg font-semibold text-surface-200 mb-1">{title}</h3>
      <p className="text-sm text-surface-400 text-center max-w-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
