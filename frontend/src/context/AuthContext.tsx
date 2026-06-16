import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';

export interface User {
  _id: string;
  name: string;
  email: string;
  accountType?: string;
  subscribeToNewsletter?: boolean;
  receiveNotifications?: boolean;
  defaultQRColor?: string;
  defaultQRBgColor?: string;
  defaultQREyeStyle?: string;
  defaultQRPatternStyle?: string;
  qrCodesCount?: number;
  theme?: 'light' | 'dark' | 'system';
  twoFactorEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    accountType?: string,
    subscribeToNewsletter?: boolean,
    agreeToTerms?: boolean
  ) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  fetchSessions: () => Promise<any[]>;
  revokeSession: (id: string) => Promise<void>;
  revokeOtherSessions: () => Promise<void>;
  fetchApiKeys: () => Promise<any[]>;
  createApiKey: (name: string) => Promise<any>;
  revokeApiKey: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored auth token
    const token = localStorage.getItem('authToken');
    if (token) {
      // Initialize with cached data first to prevent flash
      const userData = localStorage.getItem('userData');
      if (userData) {
        setUser(JSON.parse(userData));
      }

      // Verify and sync user profile with backend database
      const verifySession = async () => {
        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              localStorage.setItem('userData', JSON.stringify(data.user));
              setUser(data.user);
            }
          } else if (response.status === 401) {
            // Revoke local session on auth failure
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            setUser(null);
          }
        } catch (error) {
          console.error('Sync profile on mount error:', error);
        }
      };
      verifySession();
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

  const register = async (
    name: string,
    email: string,
    password: string,
    accountType?: string,
    subscribeToNewsletter?: boolean,
    agreeToTerms?: boolean
  ) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          accountType,
          subscribeToNewsletter,
          agreeToTerms
        }),
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

  const updateProfile = async (data: Partial<User>) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please log in again.');
      }

      const result = await response.json();
      
      if (result.success) {
        localStorage.setItem('userData', JSON.stringify(result.user));
        setUser(result.user);
      } else {
        throw new Error(result.message || result.error || 'Profile update failed');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please log in again.');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  };

  const fetchSessions = async () => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/auth/sessions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    const result = await response.json();
    if (result.success) {
      return result.sessions;
    } else {
      throw new Error(result.message || 'Failed to fetch sessions');
    }
  };

  const revokeSession = async (id: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/auth/sessions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to revoke session');
    }
  };

  const revokeOtherSessions = async () => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/auth/sessions`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to revoke other sessions');
    }
  };

  const fetchApiKeys = async () => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/api-keys`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    const result = await response.json();
    if (result.success) {
      return result.apiKeys;
    } else {
      throw new Error(result.message || 'Failed to fetch API keys');
    }
  };

  const createApiKey = async (name: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    const result = await response.json();
    if (result.success) {
      // Return both the metadata and the raw key (shown only once)
      return { ...result.apiKey, rawKey: result.rawKey };
    } else {
      throw new Error(result.message || 'Failed to create API key');
    }
  };

  const revokeApiKey = async (id: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/api-keys/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to revoke API key');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      updateProfile, 
      changePassword,
      fetchSessions,
      revokeSession,
      revokeOtherSessions,
      fetchApiKeys,
      createApiKey,
      revokeApiKey
    }}>
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