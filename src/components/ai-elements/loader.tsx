import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type LoaderIconProps = {
  size?: number;
};

const LoaderIcon = ({ size = 16 }: LoaderIconProps) => (
  <svg
    height={size}
    viewBox="0 0 24 24"
    width={size}
    style={{ color: "currentcolor" }}
  >
    <defs>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .spinner { animation: spin 2s linear infinite; transform-origin: center; }
        .pulse-dot { animation: pulse 1.5s ease-in-out infinite; }
      `}</style>
    </defs>
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="15 60" className="spinner" />
    <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.5" className="pulse-dot" />
  </svg>
);

export type LoaderProps = HTMLAttributes<HTMLDivElement> & {
  size?: number;
};

export const Loader = ({ className, size = 16, ...props }: LoaderProps) => (
  <div
    className={cn(
      "inline-flex items-center justify-center",
      className
    )}
    {...props}
  >
    <LoaderIcon size={size} />
  </div>
);
