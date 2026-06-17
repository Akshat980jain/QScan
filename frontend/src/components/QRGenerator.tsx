import React, { useState, useEffect, useCallback, useRef } from 'react';
import QRCodeLib from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { useQR } from '../context/QRContext';
import { useDialog } from '../context/DialogContext';
import { API_URL, PRODUCTION_API_URL } from '../config';
import { 
  Download, 
  Save, 
  Wifi, 
  User, 
  Link, 
  Type, 
  Palette, 
  Settings, 
  Copy, 
  Share2, 
  Eye,
  EyeOff,
  Smartphone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
  Sparkles,
  QrCode,
  Clock,
  ChevronDown
} from 'lucide-react';

// Actual QR generation function with custom visual rendering
export const generateQRDataURL = async (
  content: string,
  options: QROptions,
  custom: {
    eyeStyle: 'square' | 'circle' | 'rounded';
    patternStyle: 'square' | 'dot' | 'line';
    isGradient: boolean;
    gradientType: 'linear' | 'radial';
    gradientStart: string;
    gradientEnd: string;
  }
) => {
  try {
    const qr = QRCodeLib.create(content, { 
      errorCorrectionLevel: options.logoUrl ? 'H' : options.errorCorrectionLevel || 'M' 
    });
    const { modules } = qr;
    const count = modules.size;
    const size = options.size || 400;
    const cellSize = size / count;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Background
    ctx.fillStyle = options.bgColor || '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // Setup foreground style (gradient or solid)
    let fgStyle: string | CanvasGradient = options.fgColor || '#000000';
    if (custom.isGradient) {
      const grad = custom.gradientType === 'radial'
        ? ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size * 0.7)
        : ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, custom.gradientStart);
      grad.addColorStop(1, custom.gradientEnd);
      fgStyle = grad;
    }

    // Draw modules
    const isEyeZone = (r: number, c: number) => {
      if (r < 7 && c < 7) return true; // Top-left eye
      if (r < 7 && c >= count - 7) return true; // Top-right eye
      if (r >= count - 7 && c < 7) return true; // Bottom-left eye
      return false;
    };

    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        const isDark = modules.get(r, c);
        if (!isDark) continue;

        // Skip eye zone blocks if custom eye shapes are selected
        if (custom.eyeStyle !== 'square' && isEyeZone(r, c)) {
          continue;
        }

        ctx.fillStyle = fgStyle;
        const x = c * cellSize;
        const y = r * cellSize;

        if (custom.patternStyle === 'dot') {
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (custom.patternStyle === 'line') {
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1, cellSize * 0.25);
          } else {
            ctx.rect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
          }
          ctx.fill();
        } else {
          // Square
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Render Custom Eyes if eyeStyle is not square
    if (custom.eyeStyle !== 'square') {
      const eyes = [
        { r: 0, c: 0 },
        { r: 0, c: count - 7 },
        { r: count - 7, c: 0 }
      ];

      eyes.forEach(eye => {
        const ex = eye.c * cellSize;
        const ey = eye.r * cellSize;
        const w = 7 * cellSize;

        ctx.strokeStyle = fgStyle;
        ctx.fillStyle = fgStyle;
        ctx.lineWidth = cellSize;

        if (custom.eyeStyle === 'circle') {
          // Outer circle
          ctx.beginPath();
          ctx.arc(ex + w / 2, ey + w / 2, w / 2 - cellSize / 2, 0, Math.PI * 2);
          ctx.stroke();

          // Inner circle
          ctx.beginPath();
          ctx.arc(ex + w / 2, ey + w / 2, cellSize * 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (custom.eyeStyle === 'rounded') {
          // Outer rounded eye
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(ex + cellSize / 2, ey + cellSize / 2, w - cellSize, w - cellSize, cellSize * 1.6);
          } else {
            ctx.rect(ex + cellSize / 2, ey + cellSize / 2, w - cellSize, w - cellSize);
          }
          ctx.stroke();

          // Inner rounded dot
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(ex + cellSize * 2, ey + cellSize * 2, cellSize * 3, cellSize * 3, cellSize * 0.8);
          } else {
            ctx.rect(ex + cellSize * 2, ey + cellSize * 2, cellSize * 3, cellSize * 3);
          }
          ctx.fill();
        }
      });
    }

    // Embed Logo
    if (options.logoUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const logoSize = size * (options.logoSize || 0.2);
          const lx = (size - logoSize) / 2;
          const ly = (size - logoSize) / 2;

          // Draw white container for logo
          ctx.fillStyle = options.bgColor || '#FFFFFF';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(lx - 4, ly - 4, logoSize + 8, logoSize + 8, logoSize * 0.2);
          } else {
            ctx.rect(lx - 4, ly - 4, logoSize + 8, logoSize + 8);
          }
          ctx.fill();

          // Draw logo
          ctx.drawImage(img, lx, ly, logoSize, logoSize);
          resolve();
        };
        img.onerror = () => {
          resolve();
        };
        img.src = options.logoUrl!;
      });
    }

    return canvas.toDataURL();
  } catch (error) {
    console.error('Error generating custom QR code:', error);
    return '';
  }
};

type QRType = 'text' | 'url' | 'wifi' | 'contact' | 'email' | 'sms' | 'phone' | 'location' | 'event' | 'payment';

export interface QROptions {
  size: number;
  margin: number;
  fgColor: string;
  bgColor: string;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  logoUrl?: string;
  logoSize?: number;
}

interface WiFiData {
  ssid: string;
  password: string;
  security: 'WPA' | 'WPA2' | 'WEP' | 'nopass';
  hidden: boolean;
}

interface ContactData {
  name: string;
  phone: string;
  email: string;
  organization: string;
  website: string;
  address: string;
  title: string;
}

interface EmailData {
  to: string;
  subject: string;
  body: string;
}

interface SMSData {
  number: string;
  message: string;
}

interface LocationData {
  latitude: string;
  longitude: string;
  label: string;
}

interface EventData {
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
}

interface PaymentData {
  recipient: string;
  amount: string;
  currency: string;
  note: string;
}

const QR_TYPES = [
  { type: 'text' as QRType, icon: Type, label: 'Text', description: 'Plain text content' },
  { type: 'url' as QRType, icon: Link, label: 'URL', description: 'Website link' },
  { type: 'wifi' as QRType, icon: Wifi, label: 'WiFi', description: 'Network credentials' },
  { type: 'contact' as QRType, icon: User, label: 'Contact', description: 'vCard contact info' },
  { type: 'email' as QRType, icon: Mail, label: 'Email', description: 'Email composition' },
  { type: 'sms' as QRType, icon: Smartphone, label: 'SMS', description: 'Text message' },
  { type: 'phone' as QRType, icon: Smartphone, label: 'Phone', description: 'Phone number' },
  { type: 'location' as QRType, icon: MapPin, label: 'Location', description: 'GPS coordinates' },
  { type: 'event' as QRType, icon: Calendar, label: 'Event', description: 'Calendar event' },
  { type: 'payment' as QRType, icon: CreditCard, label: 'Payment', description: 'Payment request' }
];

// IMPROVED: Color presets adjusted for better contrast (WCAG AA compliant)
const COLOR_PRESETS = [
  { name: 'Classic', fg: '#000000', bg: '#FFFFFF' },
  { name: 'Blue',    fg: '#1E40AF', bg: '#EFF6FF' },
  { name: 'Green',   fg: '#047857', bg: '#ECFDF5' },
  { name: 'Purple',  fg: '#6D28D9', bg: '#F5F3FF' }, // Changed from #7C3AED
  { name: 'Orange',  fg: '#C2410C', bg: '#FFF7ED' }, // Changed from #EA580C
  { name: 'Red',     fg: '#B91C1C', bg: '#FEF2F2' }, // Changed from #DC2626
  { name: 'Dark',    fg: '#FFFFFF', bg: '#1F2937' }
];

export function QRGenerator() {
  const [qrType, setQrType] = useState<QRType>('text');
  const [textContent, setTextContent] = useState('');
  const [urlContent, setUrlContent] = useState('');
  const [phoneContent, setPhoneContent] = useState('');
  const [wifiData, setWifiData] = useState<WiFiData>({
    ssid: '',
    password: '',
    security: 'WPA2',
    hidden: false
  });
  const [contactData, setContactData] = useState<ContactData>({
    name: '',
    phone: '',
    email: '',
    organization: '',
    website: '',
    address: '',
    title: ''
  });
  const [emailData, setEmailData] = useState<EmailData>({
    to: '',
    subject: '',
    body: ''
  });
  const [smsData, setSmsData] = useState<SMSData>({
    number: '',
    message: ''
  });
  const [locationData, setLocationData] = useState<LocationData>({
    latitude: '',
    longitude: '',
    label: ''
  });
  const [eventData, setEventData] = useState<EventData>({
    title: '',
    startDate: '',
    endDate: '',
    location: '',
    description: ''
  });
  const [paymentData, setPaymentData] = useState<PaymentData>({
    recipient: '',
    amount: '',
    currency: 'USD',
    note: ''
  });

  const [qrOptions, setQrOptions] = useState<QROptions>({
    size: 400,
    margin: 2,
    fgColor: '#000000',
    bgColor: '#FFFFFF',
    errorCorrectionLevel: 'M',
    logoSize: 0.2
  });

  const [qrDataURL, setQrDataURL] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [history, setHistory] = useState<Array<{id: string, type: QRType, content: string, dataURL: string, timestamp: number}>>([]);
  const [customName, setCustomName] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { user } = useAuth();
  const { saveQR, currentWorkspace } = useQR();
  const { alert } = useDialog();
  const [showEnlarged, setShowEnlarged] = useState(false);

  const [eyeStyle, setEyeStyle] = useState<'square' | 'circle' | 'rounded'>('square');
  const [patternStyle, setPatternStyle] = useState<'square' | 'dot' | 'line'>('square');
  const [isGradient, setIsGradient] = useState(false);
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [gradientStart, setGradientStart] = useState('#f97316');
  const [gradientEnd, setGradientEnd] = useState('#ea580c');
  const [isDynamic, setIsDynamic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);

  const [generatorMode, setGeneratorMode] = useState<'single' | 'bulk'>('single');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkFormat, setBulkFormat] = useState<'png' | 'svg'>('png');
  const [bulkPreview, setBulkPreview] = useState<Array<{ name: string, content: string }>>([]);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateQRContent = useCallback((): string => {
    switch (qrType) {
      case 'text':
        return textContent;
      case 'url':
        return urlContent;
      case 'phone':
        return `tel:${phoneContent}`;
      case 'wifi':
        return `WIFI:T:${wifiData.security};S:${wifiData.ssid};P:${wifiData.password};H:${wifiData.hidden ? 'true' : 'false'};;`;
      case 'contact':
        return `BEGIN:VCARD
VERSION:3.0
FN:${contactData.name}
TEL:${contactData.phone}
EMAIL:${contactData.email}
ORG:${contactData.organization}
URL:${contactData.website}
ADR:;;${contactData.address};;;;
TITLE:${contactData.title}
END:VCARD`;
      case 'email':
        return `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
      case 'sms':
        return `sms:${smsData.number}?body=${encodeURIComponent(smsData.message)}`;
      case 'location':
        return `geo:${locationData.latitude},${locationData.longitude}?q=${locationData.latitude},${locationData.longitude}(${encodeURIComponent(locationData.label)})`;
      case 'event':
        return `BEGIN:VEVENT
DTSTART:${eventData.startDate.replace(/[-:]/g, '').replace('T', '')}00Z
DTEND:${eventData.endDate.replace(/[-:]/g, '').replace('T', '')}00Z
SUMMARY:${eventData.title}
LOCATION:${eventData.location}
DESCRIPTION:${eventData.description}
END:VEVENT`;
      case 'payment':
        return `${paymentData.recipient}?amount=${paymentData.amount}&currency=${paymentData.currency}&note=${encodeURIComponent(paymentData.note)}`;
      default:
        return '';
    }
  }, [qrType, textContent, urlContent, phoneContent, wifiData, contactData, emailData, smsData, locationData, eventData, paymentData]);

  const validateContent = useCallback((): string[] => {
    const errors: string[] = [];
    const content = generateQRContent();
    
    if (!content.trim()) {
      errors.push('Content cannot be empty');
    }

    switch (qrType) {
      case 'url':
        try {
          new URL(urlContent);
        } catch {
          errors.push('Invalid URL format');
        }
        break;
      case 'email':
        if (emailData.to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailData.to)) {
          errors.push('Invalid email address');
        }
        break;
      case 'phone':
        if (phoneContent && !/^\+?[\d\s\-\(\)]+$/.test(phoneContent)) {
          errors.push('Invalid phone number format');
        }
        break;
      case 'location':
        if (locationData.latitude && (isNaN(parseFloat(locationData.latitude)) || Math.abs(parseFloat(locationData.latitude)) > 90)) {
          errors.push('Invalid latitude (-90 to 90)');
        }
        if (locationData.longitude && (isNaN(parseFloat(locationData.longitude)) || Math.abs(parseFloat(locationData.longitude)) > 180)) {
          errors.push('Invalid longitude (-180 to 180)');
        }
        break;
      case 'wifi':
        if (!wifiData.ssid.trim()) {
          errors.push('WiFi network name is required');
        }
        break;
    }

    return errors;
  }, [qrType, generateQRContent, urlContent, emailData, phoneContent, locationData, wifiData]);

  const generateQR = async () => {
    const errors = validateContent();
    setValidationErrors(errors);
    
    if (errors.length > 0) return;

    const content = generateQRContent();
    if (!content.trim()) return;

    setIsGenerating(true);
    try {
      const dataURL = await generateQRDataURL(content, qrOptions, {
        eyeStyle,
        patternStyle,
        isGradient,
        gradientType,
        gradientStart,
        gradientEnd
      });
      setQrDataURL(dataURL);
      
      // Add to history
      const newEntry = {
        id: Date.now().toString(),
        type: qrType,
        content,
        dataURL,
        timestamp: Date.now()
      };
      setHistory(prev => [newEntry, ...prev.slice(0, 9)]); // Keep last 10
    } catch (error) {
      console.error('QR generation failed:', error);
      setValidationErrors(['Failed to generate QR code']);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrDataURL) return;
    const link = document.createElement('a');
    link.download = `${customName || getQRName()}-${Date.now()}.png`;
    link.href = qrDataURL;
    link.click();
  };

  const downloadSVG = () => {
    if (!qrDataURL) return;
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${qrOptions.size}" height="${qrOptions.size}">
      <image href="${qrDataURL}" width="${qrOptions.size}" height="${qrOptions.size}" />
    </svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${customName || getQRName()}-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    if (!qrDataURL) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${customName || getQRName()}</title>
            <style>
              body {
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                font-family: sans-serif;
              }
              img {
                max-width: 100%;
                max-height: 80%;
                object-fit: contain;
              }
              @media print {
                body {
                  margin: 0;
                }
                img {
                  width: 100%;
                  height: auto;
                }
              }
            </style>
          </head>
          <body>
            <img src="${qrDataURL}" onload="window.print();window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateQRContent());
      // Show success feedback
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareQR = async () => {
    if (!qrDataURL) return;
    
    try {
      const response = await fetch(qrDataURL);
      const blob = await response.blob();
      const file = new File([blob], `${getQRName()}.png`, { type: 'image/png' });
      
      if (navigator.share) {
        await navigator.share({
          title: 'QR Code',
          text: getQRName(),
          files: [file]
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const getQRName = (): string => {
    switch (qrType) {
      case 'text':
        return textContent.slice(0, 30) + (textContent.length > 30 ? '...' : '');
      case 'url':
        try {
          return new URL(urlContent).hostname || urlContent;
        } catch {
          return urlContent;
        }
      case 'wifi':
        return `WiFi: ${wifiData.ssid}`;
      case 'contact':
        return `Contact: ${contactData.name}`;
      case 'email':
        return `Email: ${emailData.to}`;
      case 'sms':
        return `SMS: ${smsData.number}`;
      case 'phone':
        return `Phone: ${phoneContent}`;
      case 'location':
        return `Location: ${locationData.label || 'GPS'}`;
      case 'event':
        return `Event: ${eventData.title}`;
      case 'payment':
        return `Payment: ${paymentData.recipient}`;
      default:
        return 'QR Code';
    }
  };

  const loadFromHistory = (item: typeof history[0]) => {
    setQrDataURL(item.dataURL);
    // You could also restore the original form data here
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setQrOptions(prev => ({ ...prev, logoUrl: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setTextContent('');
    setUrlContent('');
    setPhoneContent('');
    setWifiData({ ssid: '', password: '', security: 'WPA2', hidden: false });
    setContactData({ name: '', phone: '', email: '', organization: '', website: '', address: '', title: '' });
    setEmailData({ to: '', subject: '', body: '' });
    setSmsData({ number: '', message: '' });
    setLocationData({ latitude: '', longitude: '', label: '' });
    setEventData({ title: '', startDate: '', endDate: '', location: '', description: '' });
    setPaymentData({ recipient: '', amount: '', currency: 'USD', note: '' });
    setQrDataURL('');
    setCustomName('');
    setValidationErrors([]);
  };

  const saveToLibrary = async () => {
    if (!qrDataURL) return;
    setIsSaving(true);
    try {
      const payloadContent = generateQRContent();
      
      let finalContent = payloadContent;
      let shortId = undefined;
      let finalDataURL = qrDataURL;

      if (isDynamic && qrType === 'url') {
        // Generate random 8-character hex string
        shortId = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        
        // Always use the production backend URL for the QR image so it's scannable
        // on any device — never localhost (which only works on the dev machine).
        const cleanApiUrl = PRODUCTION_API_URL.endsWith('/') ? PRODUCTION_API_URL.slice(0, -1) : PRODUCTION_API_URL;
        finalContent = `${cleanApiUrl}/r/${shortId}`;

        finalDataURL = await generateQRDataURL(finalContent, qrOptions, {
          eyeStyle,
          patternStyle,
          isGradient,
          gradientType,
          gradientStart,
          gradientEnd
        });
      }

      await saveQR({
        type: qrType,
        content: finalContent,
        image: finalDataURL,
        name: customName || getQRName(),
        createdAt: new Date().toISOString(),
        isDynamic: isDynamic && qrType === 'url',
        targetUrl: isDynamic && qrType === 'url' ? payloadContent : undefined,
        shortId,
        customization: {
          foregroundColor: qrOptions.fgColor,
          backgroundColor: qrOptions.bgColor,
          eyeStyle,
          patternStyle,
          logoImage: qrOptions.logoUrl
        },
        workspaceId: currentWorkspace?._id || undefined
      });
      await alert('Success', 'Successfully saved to your library!');
      // Switch tab to library by triggering custom event
      const event = new Event('switchToLibrary');
      window.dispatchEvent(event);
    } catch (err) {
      const error = err as Error;
      console.error(error);
      setValidationErrors([error.message || 'Failed to save to library']);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBulkFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => row.split(','));
        const parsed: Array<{ name: string, content: string }> = [];
        let startIndex = 0;
        
        if (rows[0] && rows[0][0].toLowerCase().trim() === 'name') {
          startIndex = 1;
        }
        
        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          if (row.length >= 2) {
            const name = row[0].trim();
            const content = row[1].trim();
            if (name || content) {
              parsed.push({ name, content });
            }
          }
        }
        setBulkPreview(parsed.slice(0, 10));
      };
      reader.readAsText(file);
    }
  };

  const generateBulkZIP = async () => {
    if (!bulkFile) {
      await alert('Upload Required', 'Please upload a CSV file first.');
      return;
    }
    setIsBulkGenerating(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => row.split(','));
        const items: Array<{ name: string, content: string }> = [];
        let startIndex = 0;
        
        if (rows[0] && rows[0][0].toLowerCase().trim() === 'name') {
          startIndex = 1;
        }
        
        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          if (row.length >= 2) {
            const name = row[0].trim();
            const content = row[1].trim();
            if (content) {
              items.push({ name: name || `qr_${i}`, content });
            }
          }
        }

        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/api/qr-codes/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ items, format: bulkFormat })
        });

        if (!response.ok) {
          throw new Error('Failed to generate bulk ZIP');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bulk-qrcodes-${Date.now()}.zip`;
        link.click();
        URL.revokeObjectURL(url);
      };
      reader.readAsText(bulkFile);
    } catch (error: any) {
      console.error(error);
      await alert('Generation Failed', error.message || 'Failed to generate bulk QR codes.');
    } finally {
      setIsBulkGenerating(false);
    }
  };

  // Pre-fill generator states with user-configured styling defaults from database
  useEffect(() => {
    if (user) {
      if (user.defaultQRColor) {
        setQrOptions(prev => ({ ...prev, fgColor: user.defaultQRColor || '#000000' }));
      }
      if (user.defaultQRBgColor) {
        setQrOptions(prev => ({ ...prev, bgColor: user.defaultQRBgColor || '#FFFFFF' }));
      }
      if (user.defaultQREyeStyle) {
        setEyeStyle((user.defaultQREyeStyle as any) || 'square');
      }
      if (user.defaultQRPatternStyle) {
        setPatternStyle((user.defaultQRPatternStyle as any) || 'square');
      }
    }
  }, [user]);

  useEffect(() => {
    if (qrDataURL) {
      generateQR();
    }
  }, [qrOptions, eyeStyle, patternStyle, isGradient, gradientType, gradientStart, gradientEnd]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Advanced QR Code Generator</h1>
        <p className="text-gray-700 text-lg">Create customized QR codes with advanced options and multiple data types</p>
      </div>

      <div className="grid xl:grid-cols-3 gap-8">
        {/* Left Panel - Form */}
        <div className="xl:col-span-2 space-y-6">
          {/* Mode Switcher */}
          <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-255 flex space-x-4">
            <button
              onClick={() => setGeneratorMode('single')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold text-center transition-all ${
                generatorMode === 'single'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-orange-50'
              }`}
            >
              Single QR Code
            </button>
            <button
              onClick={() => setGeneratorMode('bulk')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold text-center transition-all ${
                generatorMode === 'bulk'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-orange-50'
              }`}
            >
              Bulk QR Generation
            </button>
          </div>

          {generatorMode === 'bulk' ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Sparkles className="w-6 h-6 text-orange-600 mr-2 animate-pulse" />
                Bulk QR Generation
              </h2>
              
              <p className="text-sm text-gray-600 leading-relaxed">
                Upload a CSV file containing the data you want to convert to QR codes in bulk. 
                Your CSV should have two columns: <code className="bg-gray-150 px-1.5 py-0.5 rounded text-orange-600 font-mono text-xs font-semibold">name</code> and <code className="bg-gray-150 px-1.5 py-0.5 rounded text-orange-600 font-mono text-xs font-semibold">content</code>.
              </p>

              {/* Template Download */}
              <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  <span className="font-semibold block mb-0.5">Need a template?</span>
                  Download our sample CSV file to quickly format your list.
                </div>
                <button
                  onClick={() => {
                    const csvContent = "name,content\nGoogle,https://google.com\nMy Profile,https://qrvault.com/user/john\nOffice Wi-Fi,WIFI:S:OfficeNet;T:WPA;P:secret123;;\n";
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'qrvault-bulk-template.csv';
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Download Template
                </button>
              </div>

              {/* File Upload Dropzone */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-300 transition-colors bg-gray-50/50">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  {bulkFile ? <span className="font-semibold text-orange-600">{bulkFile.name}</span> : "Select or drag and drop your CSV file"}
                </p>
                <p className="text-xs text-gray-400 mb-4">CSV text file up to 5MB</p>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleBulkFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium text-sm transition-colors shadow-md"
                >
                  Choose CSV File
                </button>
              </div>

              {/* Format selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                  <select
                    value={bulkFormat}
                    onChange={(e) => setBulkFormat(e.target.value as any)}
                    className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  >
                    <option value="png">PNG Images (Raster)</option>
                    <option value="svg">SVG Images (Vector)</option>
                  </select>
                </div>
              </div>

              {/* Preview Section */}
              {bulkPreview.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                  <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Preview (First 10 items)</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {bulkPreview.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-xs p-2 bg-white rounded border border-gray-150">
                        <span className="font-medium text-gray-800 truncate max-w-[120px]">{item.name}</span>
                        <span className="text-gray-500 truncate max-w-[240px]">{item.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bulk Generate Button */}
              <button
                onClick={generateBulkZIP}
                disabled={isBulkGenerating || !bulkFile}
                className={`w-full flex items-center justify-center space-x-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] ${
                  isBulkGenerating || !bulkFile
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg'
                }`}
              >
                {isBulkGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                <span>{isBulkGenerating ? 'Generating ZIP...' : 'Generate & Download ZIP'}</span>
              </button>
            </div>
          ) : (
            <>
              {/* QR Type Selection */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <Sparkles className="w-6 h-6 text-orange-600 mr-2" />
                  Select QR Type
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {QR_TYPES.map(({ type, icon: Icon, label, description }) => (
                    <button
                      key={type}
                      onClick={() => setQrType(type)}
                      className={`flex flex-col items-center p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                        qrType === type
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg ring-2 ring-orange-300'
                          : 'bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:shadow-md'
                      }`}
                      title={description}
                    >
                      <Icon className="w-6 h-6 mb-2" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Form */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <FileText className="w-6 h-6 text-orange-600 mr-2" />
                    Content
                  </h2>
                  <button
                    onClick={resetForm}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-300"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-pulse">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-800 font-medium">Please fix the following errors:</span>
                    </div>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validationErrors.map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dynamic Form Content */}
                {qrType === 'text' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Text Content</label>
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Enter any text content..."
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 resize-none"
                        rows={4}
                        maxLength={2000}
                      />
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-600">{textContent.length}/2000 characters</div>
                        <div className={`text-xs ${textContent.length > 1800 ? 'text-orange-600' : 'text-gray-500'}`}>
                          {textContent.length > 1800 ? 'Approaching limit' : 'Characters remaining'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {qrType === 'url' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                      <div className="relative">
                        <input
                          type="url"
                          value={urlContent}
                          onChange={(e) => setUrlContent(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full p-4 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                        <Link className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      </div>
                      {urlContent && !urlContent.startsWith('http') && (
                        <div className="text-xs text-orange-600 mt-1">Tip: Include https:// for better compatibility</div>
                      )}

                      {/* Dynamic QR Toggle */}
                      <div className="mt-4 p-4 bg-orange-50/50 border border-orange-100 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-800 text-sm flex items-center">
                            <RefreshCw className="w-4 h-4 text-orange-600 mr-2 animate-spin-slow" />
                            Dynamic QR Code
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Redirects through our server so you can change the target URL later and track scans.
                          </div>
                        </div>
                        <div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isDynamic}
                              onChange={(e) => setIsDynamic(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {qrType === 'phone' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={phoneContent}
                          onChange={(e) => setPhoneContent(e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="w-full p-4 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                        <Smartphone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      </div>
                    </div>
                  </div>
                )}

                {qrType === 'wifi' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Network Name (SSID)</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={wifiData.ssid}
                          onChange={(e) => setWifiData({...wifiData, ssid: e.target.value})}
                          placeholder="My WiFi Network"
                          className="w-full p-4 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                        <Wifi className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={wifiData.password}
                          onChange={(e) => setWifiData({...wifiData, password: e.target.value})}
                          placeholder="WiFi password"
                          className="w-full p-4 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Security Type</label>
                        <select
                          value={wifiData.security}
                          onChange={(e) => setWifiData({...wifiData, security: e.target.value as 'WPA' | 'WPA2' | 'WEP' | 'nopass'})}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        >
                          <option value="WPA2">WPA2 (Recommended)</option>
                          <option value="WPA">WPA</option>
                          <option value="WEP">WEP</option>
                          <option value="nopass">No Password</option>
                        </select>
                      </div>
                      <div className="flex items-center pt-8">
                        <input
                          id="hidden-wifi"
                          type="checkbox"
                          checked={wifiData.hidden}
                          onChange={(e) => setWifiData({...wifiData, hidden: e.target.checked})}
                          className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <label htmlFor='hidden-wifi' className="ml-3 text-sm text-gray-700">Hidden Network</label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Form */}
                {qrType === 'contact' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          value={contactData.name}
                          onChange={(e) => setContactData({...contactData, name: e.target.value})}
                          placeholder="John Doe"
                          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <input
                          type="tel"
                          value={contactData.phone}
                          onChange={(e) => setContactData({...contactData, phone: e.target.value})}
                          placeholder="+1 (555) 123-4567"
                          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input
                          type="email"
                          value={contactData.email}
                          onChange={(e) => setContactData({...contactData, email: e.target.value})}
                          placeholder="john@example.com"
                          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                        <input
                          type="text"
                          value={contactData.organization}
                          onChange={(e) => setContactData({...contactData, organization: e.target.value})}
                          placeholder="Company Name"
                          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                      <input
                        type="url"
                        value={contactData.website}
                        onChange={(e) => setContactData({...contactData, website: e.target.value})}
                        placeholder="https://example.com"
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <textarea
                        value={contactData.address}
                        onChange={(e) => setContactData({...contactData, address: e.target.value})}
                        placeholder="123 Main St, City, State 12345"
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 resize-none"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                      <input
                        type="text"
                        value={contactData.title}
                        onChange={(e) => setContactData({...contactData, title: e.target.value})}
                        placeholder="Software Engineer"
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                  </div>
                )}

                {/* Email Form */}
                {qrType === 'email' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">To Email Address</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={emailData.to}
                          onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                          placeholder="recipient@example.com"
                          className="w-full p-4 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                      <input
                        type="text"
                        value={emailData.subject}
                        onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                        placeholder="Email subject"
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Message Body</label>
                      <textarea
                        value={emailData.body}
                        onChange={(e) => setEmailData({...emailData, body: e.target.value})}
                        placeholder="Your email message..."
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 resize-none"
                        rows={4}
                      />
                    </div>
                  </div>
                )}

                {/* SMS Form */}
                {qrType === 'sms' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={smsData.number}
                          onChange={(e) => setSmsData({...smsData, number: e.target.value})}
                          placeholder="+1 (555) 123-4567"
                          className="w-full p-4 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                        <Smartphone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                      <textarea
                        value={smsData.message}
                        onChange={(e) => setSmsData({...smsData, message: e.target.value})}
                        placeholder="Your SMS message..."
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 resize-none"
                        rows={4}
                        maxLength={160}
                      />
                      <div className="text-xs text-gray-600 mt-1">{smsData.message.length}/160 characters</div>
                    </div>
                  </div>
                )}

                {/* Location Form */}
                {qrType === 'location' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={locationData.latitude}
                          onChange={(e) => setLocationData({...locationData, latitude: e.target.value})}
                          placeholder="40.7128"
                          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={locationData.longitude}
                          onChange={(e) => setLocationData({...locationData, longitude: e.target.value})}
                          placeholder="-74.0060"
                          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location Label</label>
                      <input
                        type="text"
                        value={locationData.label}
                        onChange={(e) => setLocationData({...locationData, label: e.target.value})}
                        placeholder="New York City"
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                  </div>
                )}

                {/* Event Form */}
                {qrType === 'event' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
                      <input
                        type="text"
                        value={eventData.title}
                        onChange={(e) => setEventData({...eventData, title: e.target.value})}
                        placeholder="Team Meeting"
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time</label>
                        <input
                          type="datetime-local"
                          value={eventData.startDate}
                          onChange={(e) => setEventData({...eventData, startDate: e.target.value})}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time</label>
                        <input
                          type="datetime-local"
                          value={eventData.endDate}
                          onChange={(e) => setEventData({...eventData, endDate: e.target.value})}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={eventData.location}
                        onChange={(e) => setEventData({...eventData, location: e.target.value})}
                        placeholder="Conference Room A"
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={eventData.description}
                        onChange={(e) => setEventData({...eventData, description: e.target.value})}
                        placeholder="Event description..."
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {/* Payment Form */}
                {qrType === 'payment' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recipient</label>
                      <input
                        type="text"
                        value={paymentData.recipient}
                        onChange={(e) => setPaymentData({...paymentData, recipient: e.target.value})}
                        placeholder="john@example.com or +1234567890"
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentData.amount}
                          onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                          placeholder="25.00"
                          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                        <select
                          value={paymentData.currency}
                          onChange={(e) => setPaymentData({...paymentData, currency: e.target.value})}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="JPY">JPY (¥)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Note (Optional)</label>
                      <input
                        type="text"
                        value={paymentData.note}
                        onChange={(e) => setPaymentData({...paymentData, note: e.target.value})}
                        placeholder="Payment for services"
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                  </div>
                )}

                {/* Custom Name */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom File Name (Optional)</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="my-qr-code"
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                  />
                </div>

                {/* Generate Button */}
                <div className="mt-8 flex space-x-4">
                  <button
                    onClick={generateQR}
                    disabled={isGenerating}
                    className={`flex-1 flex items-center justify-center space-x-3 px-8 py-4 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                      isGenerating
                        ? 'bg-gray-400 text-gray-800 cursor-not-allowed'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg'
                    }`}
                  >
                    {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                    <span>{isGenerating ? 'Generating...' : 'Generate QR Code'}</span>
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="px-6 py-4 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-300 text-gray-700 hover:text-gray-900"
                    title="Copy content to clipboard"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <Settings className="w-6 h-6 text-orange-600 mr-2" />
                    Advanced Options
                  </h2>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center space-x-2 text-orange-600 hover:text-orange-800 transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                    <span>{showAdvanced ? 'Hide' : 'Show'} Advanced</span>
                  </button>
                </div>
                {showAdvanced && (
                  <div className="space-y-6">
                    {/* Size and Quality */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Size (px)</label>
                        <input
                          type="range" min="200" max="800"
                          value={qrOptions.size}
                          onChange={(e) => setQrOptions({...qrOptions, size: parseInt(e.target.value)})}
                          className="w-full"
                        />
                        <div className="text-center text-sm text-gray-600 mt-1">{qrOptions.size}px</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Error Correction</label>
                        <select
                          value={qrOptions.errorCorrectionLevel}
                          onChange={(e) => setQrOptions({...qrOptions, errorCorrectionLevel: e.target.value as 'L' | 'M' | 'Q' | 'H'})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          <option value="L">Low (7%)</option>
                          <option value="M">Medium (15%)</option>
                          <option value="Q">Quartile (25%)</option>
                          <option value="H">High (30%)</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Color Presets */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Color Presets</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {COLOR_PRESETS.map((preset, index) => (
                          <button
                            key={index}
                            onClick={() => setQrOptions({...qrOptions, fgColor: preset.fg, bgColor: preset.bg})}
                            className="flex items-center space-x-2 p-3 rounded-lg border-2 hover:border-orange-300 transition-all duration-300"
                            style={{ borderColor: qrOptions.fgColor === preset.fg && qrOptions.bgColor === preset.bg ? '#f97316' : '#e5e7eb' }}
                          >
                            <div className="w-4 h-4 rounded border" style={{ backgroundColor: preset.fg }}></div>
                            <div className="w-4 h-4 rounded border" style={{ backgroundColor: preset.bg }}></div>
                            <span className="text-sm font-medium text-gray-700">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Colors */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Foreground Color</label>
                        <input
                          type="color"
                          value={qrOptions.fgColor}
                          onChange={(e) => setQrOptions({...qrOptions, fgColor: e.target.value})}
                          className="w-full h-12 rounded-lg border border-gray-300 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                        <input
                          type="color"
                          value={qrOptions.bgColor}
                          onChange={(e) => setQrOptions({...qrOptions, bgColor: e.target.value})}
                          className="w-full h-12 rounded-lg border border-gray-300 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Logo Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Logo (Optional)</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-300 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          Choose File
                        </button>
                      </div>
                    </div>

                    {/* Visual Styling Customization */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Palette className="w-5 h-5 text-orange-600 mr-2" />
                        Visual Styling Customization
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Eye Style */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Eye Outer Shape</label>
                          <select
                            value={eyeStyle}
                            onChange={(e) => setEyeStyle(e.target.value as any)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                          >
                            <option value="square">Classic Square</option>
                            <option value="circle">Circular Eye</option>
                            <option value="rounded">Rounded Eye</option>
                          </select>
                        </div>

                        {/* Pattern Style */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">QR Code Pattern</label>
                          <select
                            value={patternStyle}
                            onChange={(e) => setPatternStyle(e.target.value as any)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                          >
                            <option value="square">Classic Blocks</option>
                            <option value="dot">Circular Dots</option>
                            <option value="line">Smooth Lines</option>
                          </select>
                        </div>
                      </div>

                      {/* Gradient Settings */}
                      <div className="mt-6">
                        <div className="flex items-center mb-3">
                          <input
                            id="gradient-fg"
                            type="checkbox"
                            checked={isGradient}
                            onChange={(e) => setIsGradient(e.target.checked)}
                            className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <label htmlFor="gradient-fg" className="ml-3 text-sm font-medium text-gray-700">
                            Use Color Gradient for QR Code
                          </label>
                        </div>

                        {isGradient && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-orange-50/50 rounded-xl border border-orange-100 animate-fadeIn">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Start Color</label>
                              <input
                                type="color"
                                value={gradientStart}
                                onChange={(e) => setGradientStart(e.target.value)}
                                className="w-full h-10 rounded border border-gray-300 cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">End Color</label>
                              <input
                                type="color"
                                value={gradientEnd}
                                onChange={(e) => setGradientEnd(e.target.value)}
                                className="w-full h-10 rounded border border-gray-300 cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Gradient Type</label>
                              <select
                                value={gradientType}
                                onChange={(e) => setGradientType(e.target.value as any)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 text-sm"
                              >
                                <option value="linear">Linear</option>
                                <option value="radial">Radial</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Panel - QR Code and Actions */}
        <div className="space-y-6">
          {/* QR Code Display */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <QrCode className="w-6 h-6 text-orange-600 mr-2" />
              QR Code
            </h2>
            <div className="flex flex-col items-center space-y-6">
              {qrDataURL ? (
                <div 
                  className="relative group cursor-zoom-in"
                  onClick={() => setShowEnlarged(true)}
                >
                  <img
                    src={qrDataURL}
                    alt="Generated QR Code"
                    className="max-w-full h-auto rounded-xl shadow-lg transition-all duration-300 group-hover:shadow-xl"
                    style={{ maxWidth: '300px' }}
                  />
                  <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-full px-3 py-1 shadow-md select-none">
                    <span className="text-xs font-medium text-gray-700">{qrOptions.size}px</span>
                  </div>
                </div>
              ) : (
                <div className="w-64 h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">Your QR code will appear here</p>
                    <p className="text-sm text-gray-400 mt-1">Fill in the form and click generate</p>
                  </div>
                </div>
              )}

              {qrDataURL && (
                <div className="flex flex-col space-y-3 w-full">
                  <div className="flex space-x-3 w-full">
                    <div className="relative flex-1">
                      <button
                        onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      
                      {isDownloadDropdownOpen && (
                        <div className="absolute left-0 bottom-full mb-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                          <button
                            onClick={() => {
                              downloadQR();
                              setIsDownloadDropdownOpen(false);
                            }}
                            className="flex items-center space-x-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 transition-colors text-left"
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span>PNG Image (Standard)</span>
                          </button>
                          <button
                            onClick={() => {
                              downloadSVG();
                              setIsDownloadDropdownOpen(false);
                            }}
                            className="flex items-center space-x-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 transition-colors text-left"
                          >
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span>SVG Vector (Scalable)</span>
                          </button>
                          <button
                            onClick={() => {
                              downloadPDF();
                              setIsDownloadDropdownOpen(false);
                            }}
                            className="flex items-center space-x-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 transition-colors text-left"
                          >
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span>PDF Document (Print)</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={shareQR}
                      className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                  {user && (
                    <button
                      onClick={saveToLibrary}
                      disabled={isSaving}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Saving...' : 'Save to Library'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <Clock className="w-5 h-5 text-orange-600 mr-2" />
                History
              </h2>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-red-600 hover:text-red-800 transition-colors p-2 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">No QR codes generated yet</p>
                  <p className="text-gray-400 text-xs mt-1">Your recent QR codes will appear here</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl hover:bg-orange-50 transition-all duration-300 cursor-pointer group"
                    onClick={() => loadFromHistory(item)}
                  >
                    <img
                      src={item.dataURL}
                      alt="QR Code"
                      className="w-12 h-12 rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {QR_TYPES.find(t => t.type === item.type)?.label}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {item.content.slice(0, 50)}...
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-orange-600 font-medium">Load</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enlarged QR Code Modal */}
      {showEnlarged && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
          onClick={() => setShowEnlarged(false)}
        >
          <div 
            className="relative max-w-lg w-full flex flex-col items-center animate-slideUp" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center text-center">
              
              <img 
                src={qrDataURL} 
                alt="Enlarged QR Code" 
                className="max-h-[60vh] max-w-full rounded-2xl shadow-md border dark:border-zinc-800 bg-white" 
              />
              
              <div className="mt-4 flex items-center justify-between w-full">
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {customName || getQRName()}
                </span>
                <span className="text-xs text-zinc-500">
                  {qrOptions.size} x {qrOptions.size} px
                </span>
              </div>
              
              <button 
                onClick={() => setShowEnlarged(false)}
                className="mt-6 w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-orange-500/10"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}