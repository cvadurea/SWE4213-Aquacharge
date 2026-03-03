import React from 'react';
import { useState } from 'react';

const Login = ({ onLogin, onSignUpClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const submitLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        try{
            const response = await fetch('http://localhost:3002/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'                
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                }),
            });
            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json')
                ? await response.json()
                : { message: 'Unexpected response from server' };

            if (response.ok) {
                localStorage.setItem('token', data.token);
                onLogin(data.user);
            } else {
                if (response.status === 401) {
                    setError('Invalid email or password.');
                } else {
                    setError(data.message || 'Login failed');
                }
            }
        } 
        catch (err) {
            setError('Could not connect to the server');
        }
    };
  return (
    <div className="Login"> 
        <h1>Login Page</h1>
        <form onSubmit = {submitLogin}>
            <input type="text" placeholder="Email" className="mb-2 p-2 border border-gray-300 rounded w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="mb-4 p-2 border border-gray-300 rounded w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="mb-4 text-red-500">{error}</p>}
            <button type="submit" className="w-full px-4 py-2 bg-green-500 text-white rounded">
                Login
            </button>
        </form>
        <button onClick={onSignUpClick} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            Sign Up 
        </button>
    </div>
  );
}

export default Login;