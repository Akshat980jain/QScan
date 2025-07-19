import React, { createContext, useContext, useState, useEffect } from 'react';

export interface QRCode {
  _id: string;
  type: string;
  content: string;
  image: string;
  name: string;
  createdAt: string;
  userId: string;
}

interface QRContextType {
  qrCodes: QRCode[];
  saveQR: (qrData: Omit<QRCode, '_id' | 'userId'>) => Promise<void>;
  deleteQR: (id: string) => Promise<void>;
  fetchQRCodes: () => Promise<void>;
}

const QRContext = createContext<QRContextType | undefined>(undefined);

export function QRProvider({ children }: { children: React.ReactNode }) {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);

  const saveQR = async (qrData: Omit<QRCode, '_id' | 'userId'>) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/qr-codes', {
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
        throw new Error(data.error || 'Failed to save QR code');
      }
    } catch (error) {
      console.error('Save QR error:', error);
      throw error;
    }
  };

  const deleteQR = async (id: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/qr-codes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchQRCodes(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to delete QR code');
      }
    } catch (error) {
      console.error('Delete QR error:', error);
      throw error;
    }
  };

  const fetchQRCodes = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setQrCodes([]);
        return;
      }

      const response = await fetch('http://localhost:5000/api/qr-codes', {
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

  useEffect(() => {
    fetchQRCodes();
  }, []);

  return (
    <QRContext.Provider value={{ qrCodes, saveQR, deleteQR, fetchQRCodes }}>
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