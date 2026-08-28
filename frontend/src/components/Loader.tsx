interface LoaderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizes = {
  sm: "w-5 h-5 border-2",
  md: "w-8 h-8 border-[3px]",
  lg: "w-12 h-12 border-4",
};

export function Loader({ size = "md", label }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`
          ${sizes[size]} rounded-full
          border-surface-600 border-t-primary-500
          animate-spin
        `}
      />
      {label && (
        <p className="text-sm text-surface-400 animate-pulse">{label}</p>
      )}
    </div>
  );
}
