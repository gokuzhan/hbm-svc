// Example Login Component

'use client';

import { Button } from '@/components/ui/button';
import { signIn, signOut } from 'next-auth/react';
import { useState } from 'react';

interface LoginFormProps {
  userType: 'staff' | 'customer';
  onSuccess?: () => void;
}

export function LoginForm({ userType, onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn(`${userType}-credentials`, {
        email,
        password,
        userType,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials');
      } else if (result?.ok) {
        onSuccess?.();
      }
    } catch {
      setError('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={`${userType}-email`} className="block text-sm font-medium">
            Email
          </label>
          <input
            id={`${userType}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full border rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor={`${userType}-password`} className="block text-sm font-medium">
            Password
          </label>
          <input
            id={`${userType}-password`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full border rounded-md px-3 py-2"
          />
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Signing in...' : `Sign in as ${userType}`}
        </Button>
      </form>
    </div>
  );
}

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut({ redirect: false });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleLogout} disabled={isLoading} variant="outline">
      {isLoading ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}
