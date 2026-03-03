import { useState } from 'react'
import './App.css'
import  Login  from './pages/Login'
import  Signup  from './pages/Signup'

function App() {
  const [isLogin, setIsLogin] = useState(true);

  function onLoginClick() {
    setIsLogin(true);
  }

  function onSignUpClick() {
    setIsLogin(false);
  }

  function onBackToLogin() {
    setIsLogin(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <div className="flex-grow flex items-center justify-center px-6">
        <div>
          {isLogin ? (
            <Login onLogin={onLoginClick} onSignUpClick={onSignUpClick} />
          ) : (
            <Signup onBackToLogin={onBackToLogin} />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
