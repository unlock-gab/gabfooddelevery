import React from "react";
import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

export function StatCard({ title, value, icon, variant = "default", trend, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            {trend && (
              <p className="text-xs mt-1">
                <span className={cn(
                  "font-medium",
                  trend.value > 0 ? "text-green-600" : trend.value < 0 ? "text-red-600" : "text-muted-foreground"
                )}>
                  {trend.value > 0 ? "+" : ""}{trend.value}%
                </span>
                <span className="text-muted-foreground ml-1">{trend.label}</span>
              </p>
            )}
          </div>
          {icon && (
            <div className={cn("p-3 rounded-full", variantStyles[variant] ?? variantStyles.default)}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
