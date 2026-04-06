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

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [userType, setUserType] = useState<'vessel_owner' | 'port_operator' | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

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
