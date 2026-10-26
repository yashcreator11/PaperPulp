import React from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  width?: string;
  height?: string;
};

function Skeleton({ className, width, height, ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      className={cn(
        "animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-700",
        width ? undefined : "w-full",
        height ? undefined : "h-6",
        className
      )}
      style={{ ...(width ? { width } : {}), ...(height ? { height } : {}) }}
    />
  );
}

export { Skeleton };
