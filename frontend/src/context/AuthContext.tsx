import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name: string; email: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored auth token
    const token = localStorage.getItem('authToken');
    if (token) {
      // In a real app, verify token with backend
      const userData = localStorage.getItem('userData');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        setUser(data.user);
      } else {
        let errorMsg = data.message || data.error || 'Login failed';
        if (data.errors && Array.isArray(data.errors)) {
          errorMsg = data.errors.map((e: { msg: string }) => e.msg).join(' ');
        }
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        setUser(data.user);
      } else {
        let errorMsg = data.message || data.error || 'Registration failed';
        if (data.errors && Array.isArray(data.errors)) {
          errorMsg = data.errors.map((e: { msg: string }) => e.msg).join(' ');
        }
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
  };

  const updateProfile = async (data: { name: string; email: string }) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (result.success) {
        localStorage.setItem('userData', JSON.stringify(result.user));
        setUser(result.user);
      } else {
        throw new Error(result.error || 'Profile update failed');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}