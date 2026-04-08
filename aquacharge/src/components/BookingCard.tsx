import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Zap } from 'lucide-react';

type BookingStatus = 'confirmed' | 'pending' | 'active' | 'completed' | 'cancelled' | 'pending_verification' | 'failed';

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
  v2gLabel?: string;
  footerAction?: React.ReactNode;
  onClick?: () => void;
}

export default function BookingCard({
  id,
  chargerId,
  startTime,
  endTime,
  status = 'confirmed',
  v2gInfo,
  v2gLabel = 'V2G',
  footerAction,
  onClick,
}: BookingCardProps) {
  const statusVariant = {
    confirmed: 'secondary' as const,
    pending: 'outline' as const,
    active: 'default' as const,
    completed: 'secondary' as const,
    cancelled: 'destructive' as const,
    pending_verification: 'outline' as const,
    failed: 'destructive' as const,
  };

  const statusClass = {
    confirmed: '',
    pending: '',
    active: '',
    completed: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
    cancelled: '',
    pending_verification: '',
    failed: '',
  } as const;

  const formatStatus = (value: BookingStatus) => {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card
      className={`transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring' : 'hover:shadow-lg'}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
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
          <Badge variant={statusVariant[status] as any} className={statusClass[status]}>
            {formatStatus(status)}
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
                {v2gLabel}: {v2gInfo.energyDischarged} kW @ ${Number(v2gInfo.pricePerKwh).toFixed(2)}/kW
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
