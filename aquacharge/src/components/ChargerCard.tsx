import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle, AlertCircle } from 'lucide-react';

interface ChargerCardProps {
  id: string | number;
  type: string;
  portId: string | number;
  isAvailable: boolean;
  onClick?: () => void;
}

export default function ChargerCard({
  id,
  type,
  portId,
  isAvailable,
  onClick,
}: ChargerCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-102"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-start space-y-3">
        <div className="flex w-full items-start justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-secondary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Charger #{id}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Type: {type}
              </p>
            </div>
          </div>
          <Badge variant={isAvailable ? 'secondary' : 'outline'}>
            {isAvailable ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {isAvailable ? 'Available' : 'Unavailable'}
          </Badge>
        </div>

        <div className="w-full pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Port ID: {portId}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
