import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { getPONavigation, getVONavigation } from '@/lib/navigation';

interface SettingsProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

const getThemeStorageKey = (user: any) => {
  if (!user) return null;

  const stableId = user.id || user.email || user.username;
  if (!stableId) return null;

  return `theme:${String(stableId)}`;
};

export function Settings({ onLogout, onNavigate }: SettingsProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userType, setUserType] = useState<'vessel_owner' | 'port_operator'>('vessel_owner');
  const [themeStorageKey, setThemeStorageKey] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      const fallbackTheme = localStorage.getItem('theme') || 'light';
      const nextIsDark = fallbackTheme === 'dark';
      setIsDarkMode(nextIsDark);
      document.documentElement.classList.toggle('dark', nextIsDark);
      return;
    }

    try {
      const parsed = JSON.parse(user);
      const nextKey = getThemeStorageKey(parsed);
      setThemeStorageKey(nextKey);

      const savedTheme = (nextKey ? localStorage.getItem(nextKey) : null) || localStorage.getItem('theme') || 'light';
      const nextIsDark = savedTheme === 'dark';
      setIsDarkMode(nextIsDark);
      document.documentElement.classList.toggle('dark', nextIsDark);

      if (parsed?.type === 'port_operator') {
        setUserType('port_operator');
      }
    } catch {
      const fallbackTheme = localStorage.getItem('theme') || 'light';
      const nextIsDark = fallbackTheme === 'dark';
      setIsDarkMode(nextIsDark);
      document.documentElement.classList.toggle('dark', nextIsDark);
      setUserType('vessel_owner');
    }
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !isDarkMode;
    setIsDarkMode(nextIsDark);
    const themeValue = nextIsDark ? 'dark' : 'light';

    if (themeStorageKey) {
      localStorage.setItem(themeStorageKey, themeValue);
    }

    localStorage.setItem('theme', themeValue);
    document.documentElement.classList.toggle('dark', nextIsDark);
  };

  const navigation = useMemo(() => {
    return userType === 'port_operator' ? getPONavigation() : getVONavigation();
  }, [userType]);

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Shared preferences for your AquaCharge experience"
      onLogout={onLogout}
      navigation={navigation}
      currentPage="settings"
      onNavigate={onNavigate}
      userType={userType}
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose between light mode and dark mode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <p className="text-base font-semibold text-foreground">Theme</p>
              <p className="text-sm text-muted-foreground">
                Current mode: {isDarkMode ? 'Dark' : 'Light'}
              </p>
            </div>
            <Button onClick={toggleTheme} className="gap-2">
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              Switch to {isDarkMode ? 'Light' : 'Dark'} Mode
            </Button>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

export default Settings;
