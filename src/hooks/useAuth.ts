'use client';

import { useState, useEffect, useCallback } from 'react';

interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  isLoading: boolean;
}

interface UseAuthResult extends AuthState {
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    userId: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/status');
        if (!response.ok) {
          setState({ isLoggedIn: false, userId: null, isLoading: false });
          return;
        }
        const data = await response.json();
        if (!cancelled) {
          setState({
            isLoggedIn: data.isLoggedIn ?? false,
            userId: data.userId ?? null,
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ isLoggedIn: false, userId: null, isLoading: false });
        }
      }
    }

    checkAuth();
    return () => { cancelled = true; };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      // Redirect to login regardless of response
      window.location.href = '/login';
    }
  }, []);

  return { ...state, logout };
}
