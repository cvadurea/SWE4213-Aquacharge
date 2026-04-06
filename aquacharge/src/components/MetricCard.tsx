import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export default function MetricCard({
  label,
  value,
  icon,
  trend,
  trendValue,
}: MetricCardProps) {
  const trendColor = {
    up: 'text-accent',
    down: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card className="flex flex-col">
      <CardContent className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-3 text-3xl font-bold text-foreground">
            {value}
          </p>
          {trend && trendValue && (
            <p className={`mt-2 text-sm font-medium ${trendColor[trend]}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <div className="ml-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
