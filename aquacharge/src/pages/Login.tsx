import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Zap } from 'lucide-react';
import { LOCAL_API_BASES } from '@/lib/api';

interface LoginProps {
  onLogin: (user: any) => void;
  onSignUpClick: () => void;
}

export default function Login({ onLogin, onSignUpClick }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fillTestUser = (testEmail: string, testPassword: string) => {
    setEmail(testEmail);
    setPassword(testPassword);
    setError('');
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${LOCAL_API_BASES.auth}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
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
    } catch (err) {
      setError('Could not connect to the server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-card px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-secondary" />
            <h1 className="text-3xl font-bold text-foreground">AquaCharge</h1>
          </div>
          <p className="text-muted-foreground">
            Vessel-to-Grid Energy Management Platform
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3 border border-destructive/20">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={submitLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Demo Accounts
                </span>
              </div>
            </div>

            {/* Test User Buttons */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fillTestUser('joseph@example.com', 'Password1')}
                disabled={isLoading}
              >
                Vessel Owner Demo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fillTestUser('jane@example.com', 'Password1')}
                disabled={isLoading}
              >
                Port Operator Demo
              </Button>
            </div>

            {/* Sign Up Link */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={onSignUpClick}
                  className="font-medium text-secondary hover:text-secondary/80 transition-colors"
                >
                  Sign up
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          © 2026 AquaCharge. All rights reserved.
        </p>
      </div>
    </div>
  );
}
