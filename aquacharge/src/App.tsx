import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Signup from './pages/Signup'
import DashboardVO from './pages/DashboardVO'
import DashboardPO from './pages/DashboardPO'
import FindChargers from './pages/FindChargers'
import MyVessels from './pages/MyVessels'
import MyBookings from './pages/MyBookings'
import PortBookings from './pages/PortBookings'
import MyPort from './pages/MyPort'
import Profile from './pages/Profile'
import { Settings } from './pages/Settings.tsx'

const getThemeStorageKey = (user: any) => {
  if (!user) return null;

  const stableId = user.id || user.email || user.username;
  if (!stableId) return null;

  return `theme:${String(stableId)}`;
};

const applyThemeForUser = (user: any) => {
  const themeKey = getThemeStorageKey(user);
  const userTheme = themeKey ? localStorage.getItem(themeKey) : null;
  const fallbackTheme = localStorage.getItem('theme') || 'light';
  const themeToApply = userTheme || fallbackTheme;
  document.documentElement.classList.toggle('dark', themeToApply === 'dark');
};

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [userType, setUserType] = useState<'vessel_owner' | 'port_operator' | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      const fallbackTheme = localStorage.getItem('theme') || 'light';
      document.documentElement.classList.toggle('dark', fallbackTheme === 'dark');
      return;
    }

    try {
      applyThemeForUser(JSON.parse(rawUser));
    } catch {
      const fallbackTheme = localStorage.getItem('theme') || 'light';
      document.documentElement.classList.toggle('dark', fallbackTheme === 'dark');
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserType(userData.type);
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
  }, [isLoggedIn]);

  function onLoginClick(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
    setUserType(user.type);
    applyThemeForUser(user);
    setIsLoggedIn(true);
  }

  function onSignUpClick() {
    setIsLogin(false);
  }

  function onBackToLogin() {
    setIsLogin(true);
  }

  function onLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserType(null);
    setIsLogin(true);
    setCurrentPage('dashboard');
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    if (!isLoggedIn || !userType) {
      return isLogin ? (
        <Login onLogin={onLoginClick} onSignUpClick={onSignUpClick} />
      ) : (
        <Signup onBackToLogin={onBackToLogin} />
      );
    }

    if (userType === 'vessel_owner') {
      switch (currentPage) {
        case 'find-chargers':
          return <FindChargers onLogout={onLogout} onNavigate={handleNavigate} />;
        case 'my-vessels':
          return <MyVessels onLogout={onLogout} onNavigate={handleNavigate} />;
        case 'my-bookings':
          return <MyBookings onLogout={onLogout} onNavigate={handleNavigate} />;
        case 'profile':
          return <Profile onLogout={onLogout} onNavigate={handleNavigate} />;
        case 'settings':
          return <Settings onLogout={onLogout} onNavigate={handleNavigate} />;
        default:
          return <DashboardVO onLogout={onLogout} onNavigate={handleNavigate} />;
      }
    } else {
      switch (currentPage) {
        case 'bookings':
          return <PortBookings onLogout={onLogout} onNavigate={handleNavigate} />;
        case 'my-port':
          return <MyPort onLogout={onLogout} onNavigate={handleNavigate} />;
        case 'profile':
          return <Profile onLogout={onLogout} onNavigate={handleNavigate} />;
        case 'settings':
          return <Settings onLogout={onLogout} onNavigate={handleNavigate} />;
        default:
          return <DashboardPO onLogout={onLogout} onNavigate={handleNavigate} />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderPage()}
    </div>
  )
}

export default App
