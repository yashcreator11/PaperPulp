import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export const KPICard = ({
  title,
  value,
  icon,
  trend,
  trendUp,
  className,
}: KPICardProps) => {
  return (
    <Card
      className={cn(
        "glass-card group transition-all hover:scale-[1.02] hover:shadow-lg",
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-4xl font-bold text-foreground">{value}</p>
            {trend && (
              <p
                className={cn(
                  "text-xs mt-2 font-medium",
                  trendUp ? "text-emerald-400" : "text-rose-500"
                )}
              >
                {trend}
              </p>
            )}
          </div>

          {/* Icon container */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-lg opacity-0 group-hover:opacity-100 transition"></div>
            <div className="relative text-primary p-3 bg-primary/10 rounded-xl flex items-center justify-center">
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
