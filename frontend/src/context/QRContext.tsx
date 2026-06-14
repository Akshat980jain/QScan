import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';

export interface QRCode {
  _id: string;
  type: string;
  content: string;
  image: string;
  name: string;
  createdAt: string;
  userId: string;
  isDynamic?: boolean;
  targetUrl?: string;
  shortId?: string;
  customization?: {
    foregroundColor?: string;
    backgroundColor?: string;
    eyeStyle?: string;
    patternStyle?: string;
    logoImage?: string;
  };
  workspaceId?: string;
}

export interface Workspace {
  _id: string;
  name: string;
  ownerId: string;
  role: string;
  createdAt: string;
}

interface QRContextType {
  qrCodes: QRCode[];
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  saveQR: (qrData: Omit<QRCode, '_id' | 'userId'>) => Promise<void>;
  deleteQR: (id: string) => Promise<void>;
  fetchQRCodes: (workspaceId?: string) => Promise<void>;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  addWorkspaceMember: (workspaceId: string, email: string, role?: string) => Promise<void>;
}

const QRContext = createContext<QRContextType | undefined>(undefined);

export function QRProvider({ children }: { children: React.ReactNode }) {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  const saveQR = async (qrData: Omit<QRCode, '_id' | 'userId'>) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/qr-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(qrData),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchQRCodes(); // Refresh the list
      } else {
        throw new Error(data.message || 'Failed to save QR code');
      }
    } catch (error) {
      console.error('Save QR error:', error);
      throw error;
    }
  };

  const deleteQR = async (id: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/qr-codes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchQRCodes(); // Refresh the list
      } else {
        throw new Error(data.message || 'Failed to delete QR code');
      }
    } catch (error) {
      console.error('Delete QR error:', error);
      throw error;
    }
  };

  const fetchQRCodes = async (workspaceId?: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setQrCodes([]);
        return;
      }

      const targetWorkspace = workspaceId !== undefined
        ? workspaceId
        : (currentWorkspace ? currentWorkspace._id : 'personal');

      const response = await fetch(`${API_URL}/api/qr-codes?workspaceId=${targetWorkspace}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setQrCodes(data.qrCodes || []);
      } else {
        console.error('Failed to fetch QR codes:', data.error);
        setQrCodes([]);
      }
    } catch (error) {
      console.error('Fetch QR codes error:', error);
      setQrCodes([]);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setWorkspaces([]);
        return;
      }

      const response = await fetch(`${API_URL}/api/workspaces`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setWorkspaces(data.workspaces || []);
      }
    } catch (error) {
      console.error('Fetch workspaces error:', error);
      setWorkspaces([]);
    }
  };

  const createWorkspace = async (name: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchWorkspaces();
      } else {
        throw new Error(data.message || 'Failed to create workspace');
      }
    } catch (error) {
      console.error('Create workspace error:', error);
      throw error;
    }
  };

  const addWorkspaceMember = async (workspaceId: string, email: string, role = 'viewer') => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to add member');
      }
    } catch (error) {
      console.error('Add workspace member error:', error);
      throw error;
    }
  };

  // Fetch workspaces and QRs on startup and membership refresh
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    fetchQRCodes();
  }, [currentWorkspace]);

  return (
    <QRContext.Provider value={{ 
      qrCodes, 
      workspaces, 
      currentWorkspace, 
      setCurrentWorkspace, 
      saveQR, 
      deleteQR, 
      fetchQRCodes, 
      fetchWorkspaces,
      createWorkspace,
      addWorkspaceMember
    }}>
      {children}
    </QRContext.Provider>
  );
}

export function useQR() {
  const context = useContext(QRContext);
  if (context === undefined) {
    throw new Error('useQR must be used within a QRProvider');
  }
  return context;
}