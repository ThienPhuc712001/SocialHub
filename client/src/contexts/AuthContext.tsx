import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, profiles, User, AuthResponse } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  showOnboarding: boolean;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      const userId = localStorage.getItem('userId');
      if (userId) {
        profiles.get(userId).then(response => {
          setUser(response.data);
          setLoading(false);
        }).catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userId');
          setToken(null);
          setUser(null);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const login = async (email: string, password: string) => {
    const response = await auth.login(email, password);
    const { token, refreshToken, user: authUser } = response.data as AuthResponse;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', authUser.id);
    setToken(token);
    const profile = await profiles.get(authUser.id);
    setUser(profile.data);
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await auth.register(username, email, password);
    const { token, refreshToken, user: authUser } = response.data as AuthResponse;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', authUser.id);
    setToken(token);
    const profile = await profiles.get(authUser.id);
    setUser(profile.data);
    // Show onboarding for new users
    setShowOnboarding(true);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      auth.logout(refreshToken).catch(() => {
        // Ignore logout errors
      });
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    setToken(null);
    setUser(null);
  };

  const updateUser = async () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      try {
        const profile = await profiles.get(userId);
        setUser(profile.data);
      } catch (err) {
          // Ignore update errors
        }
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUser, loading, isAuthenticated, theme, toggleTheme, showOnboarding, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
};