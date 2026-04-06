import React from 'react';
import { Sidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onLogout: () => void;
  navigation: Array<{
    label: string;
    id: string;
    icon?: React.ReactNode;
  }>;
  currentPage: string;
  onNavigate: (page: string) => void;
  userType: 'vessel_owner' | 'port_operator';
}

export default function DashboardLayout({
  title,
  subtitle,
  children,
  onLogout,
  navigation,
  currentPage,
  onNavigate,
  userType,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-56 md:flex-col md:bg-sidebar md:text-sidebar-foreground">
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">AquaCharge</h1>
            <p className="text-xs text-sidebar-foreground/70 mt-1">
              {userType === 'vessel_owner' ? 'Vessel Owner' : 'Port Operator'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                currentPage === item.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/20'
              }`}
            >
              {item.icon && <span className="h-4 w-4">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-sidebar-border p-4">
          <Button
            onClick={onLogout}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent/20"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card px-6 py-4 md:hidden flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">AquaCharge</h1>
          <div className="w-10" />
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground">{title}</h2>
              {subtitle && (
                <p className="mt-2 text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
