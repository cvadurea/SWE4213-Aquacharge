import { Building2, CalendarDays, Gauge, MapPin, Ship } from 'lucide-react';
import { JSX } from 'react/jsx-runtime';

export type NavigationItem = {
  label: string;
  id: string;
  icon: React.JSX.Element;
};

export const getVONavigation = (): NavigationItem[] => [
  { label: 'Dashboard', id: 'dashboard', icon: <Gauge className="h-4 w-4" /> },
  { label: 'Find Chargers', id: 'find-chargers', icon: <MapPin className="h-4 w-4" /> },
  { label: 'My Bookings', id: 'my-bookings', icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'My Vessels', id: 'my-vessels', icon: <Ship className="h-4 w-4" /> },
];

export const getPONavigation = (): NavigationItem[] => [
  { label: 'Dashboard', id: 'dashboard', icon: <Gauge className="h-4 w-4" /> },
  { label: 'Bookings', id: 'bookings', icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'My Port', id: 'my-port', icon: <Building2 className="h-4 w-4" /> },
];