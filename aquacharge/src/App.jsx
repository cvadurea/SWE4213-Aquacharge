import { useState, useEffect } from 'react'
import './App.css'
import  Login  from './pages/Login'
import  Signup  from './pages/Signup'
import DashboardVO from './pages/DashboardVO'
import DashboardPO from './pages/DashboardPO'
import MyVessels from './pages/MyVessels'
import MyPort from './pages/MyPort'
import FindChargers from './pages/FindChargers'
import MyBookings from './pages/MyBookings'

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [userType, setUserType] = useState(null);
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

  function onLoginClick(user) {
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

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <div className="flex-grow flex items-center justify-center px-6">
        <div>
          {isLoggedIn && userType ? (
            userType === 'vessel_owner' ? (
              currentPage === 'my-vessels' ? (
                <MyVessels onNavigate={handleNavigate} onLogout={onLogout} />
              ) : currentPage === 'my-bookings' ? (
                <MyBookings onNavigate={handleNavigate} onLogout={onLogout} />
              ) : currentPage === 'find-chargers' ? (
                <FindChargers onNavigate={handleNavigate} onLogout={onLogout} />
              ) : (
                <DashboardVO onLogout={onLogout} onNavigate={handleNavigate} />
              )
            ) : (
              currentPage === 'dashboard' ? (
                <DashboardPO onLogout={onLogout} onNavigate={handleNavigate} />
              ) : (
                <MyPort onNavigate={handleNavigate} onLogout={onLogout} />
              )
            )
          ) : (
            isLogin ? (
              <Login onLogin={onLoginClick} onSignUpClick={onSignUpClick} />
            ) : (
              <Signup onBackToLogin={onBackToLogin} />
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default App
