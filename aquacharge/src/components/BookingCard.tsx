import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Zap } from 'lucide-react';

type BookingStatus = 'confirmed' | 'pending' | 'active' | 'cancelled';

interface BookingCardProps {
  id: string | number;
  chargerId: string | number;
  startTime: string;
  endTime: string;
  status?: BookingStatus;
  v2gInfo?: {
    energyDischarged: number;
    pricePerKwh: number;
  };
  footerAction?: React.ReactNode;
}

export default function BookingCard({
  id,
  chargerId,
  startTime,
  endTime,
  status = 'confirmed',
  v2gInfo,
  footerAction,
}: BookingCardProps) {
  const statusVariant = {
    confirmed: 'secondary' as const,
    pending: 'outline' as const,
    active: 'default' as const,
    cancelled: 'destructive' as const,
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Booking #{id}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Charger {chargerId}
            </p>
          </div>
          <Badge variant={statusVariant[status] as any}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Start: {formatDateTime(startTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>End: {formatDateTime(endTime)}</span>
          </div>
        </div>

        {v2gInfo && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-accent font-medium">
              <Zap className="h-4 w-4" />
              <span>
                V2G: {v2gInfo.energyDischarged} kW @ ${v2gInfo.pricePerKwh.toFixed(2)}/kW
              </span>
            </div>
          </div>
        )}

        {footerAction && (
          <div className="pt-2 border-t border-border">
            {footerAction}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
