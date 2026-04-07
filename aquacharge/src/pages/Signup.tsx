import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Zap, ArrowLeft } from 'lucide-react';
import { LOCAL_API_BASES } from '@/lib/api';

interface SignupProps {
  onBackToLogin: () => void;
}

export default function Signup({ onBackToLogin }: SignupProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('vessel_owner');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = firstName && lastName && email && password && accountType;

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isFormValid) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${LOCAL_API_BASES.auth}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email,
          password: password,
          type: accountType,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : { message: 'Unexpected response from server' };

      if (response.ok) {
        localStorage.setItem('token', data.token);
        onBackToLogin();
      } else {
        setError(data.message || 'Signup failed');
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
            Create your account to get started
          </p>
        </div>

        {/* Signup Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Join the AquaCharge platform
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

            {/* Signup Form */}
            <form onSubmit={submitSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                />
                <Input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

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

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Account Type
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2 text-foreground transition-all duration-200 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                >
                  <option value="vessel_owner">Vessel Owner</option>
                  <option value="port_operator">Port Operator</option>
                </select>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            {/* Back to Login */}
            <div className="pt-4 border-t border-border">
              <button
                type="button"
                onClick={onBackToLogin}
                className="flex items-center justify-center gap-2 w-full text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </button>
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
