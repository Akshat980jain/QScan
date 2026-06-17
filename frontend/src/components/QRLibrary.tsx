import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Trash2, 
  Grid, 
  List, 
  FolderOpen, 
  Filter,
  Globe,
  Smartphone,
  Laptop,
  Chrome,
  Edit2,
  Check,
  X,
  ChevronDown,
  Activity,
  Info,
  Link,
  Copy,
  RefreshCw
} from 'lucide-react';
import { useQR } from '../context/QRContext';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import { QRDropZone } from './QRDropZone';
import { generateQRDataURL } from './QRGenerator';
import type { QRCode as QRCodeType } from '../context/QRContext';

interface AnalyticsData {
  timeSeries: Array<{ _id: string; count: number }>;
  devices: Array<{ _id: string; count: number }>;
  os: Array<{ _id: string; count: number }>;
  browsers: Array<{ _id: string; count: number }>;
  countries: Array<{ _id: string; count: number }>;
}

export function QRLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<string>('all');
  const { qrCodes, deleteQR, workspaces, fetchQRCodes } = useQR();
  const { user } = useAuth();
  const { alert, confirm } = useDialog();
  
  // Modal states
  const [selectedQR, setSelectedQR] = useState<QRCodeType | null>(null);
  const [qrImageURL, setQrImageURL] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'analytics'>('info');
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  
  // URL Editing states
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editedUrl, setEditedUrl] = useState('');
  const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  // Analytics states
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const filteredQRCodes = qrCodes.filter(qr => {
    const matchesSearch = qr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         qr.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || qr.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Fetch analytics when selected QR changes or when switching to analytics tab
  useEffect(() => {
    if (selectedQR && selectedQR.isDynamic && activeTab === 'analytics') {
      fetchAnalytics(selectedQR._id);
    }
  }, [selectedQR, activeTab]);

  // Reset tab when modal closes/opens
  useEffect(() => {
    if (selectedQR) {
      setActiveTab('info');
      setIsEditingUrl(false);
      setEditedUrl(selectedQR.targetUrl || selectedQR.content);
      setEditError(null);
      setAnalyticsData(null);
      setQrImageURL(selectedQR.image);

      const updateImage = async () => {
        if (selectedQR.isDynamic && selectedQR.type === 'url') {
          try {
            const generated = await generateQRDataURL(
              selectedQR.content,
              {
                fgColor: selectedQR.customization?.foregroundColor || '#000000',
                bgColor: selectedQR.customization?.backgroundColor || '#FFFFFF',
                size: selectedQR.size || 400,
                errorCorrectionLevel: selectedQR.logo ? 'H' : 'M',
                margin: 0
              },
              {
                eyeStyle: (selectedQR.customization?.eyeStyle as 'square' | 'circle' | 'rounded') || 'square',
                patternStyle: (selectedQR.customization?.patternStyle as 'square' | 'dot' | 'line') || 'square',
                isGradient: false,
                gradientType: 'linear',
                gradientStart: '#000000',
                gradientEnd: '#000000'
              }
            );
            if (generated) {
              setQrImageURL(generated);
            }
          } catch (err) {
            console.error('Failed to regenerate dynamic QR image', err);
          }
        }
      };
      updateImage();
    }
  }, [selectedQR]);

  const fetchAnalytics = async (id: string) => {
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/qr-codes/${id}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.analytics);
      } else {
        setAnalyticsError(data.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error(err);
      setAnalyticsError('Server error while loading analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleUpdateTargetUrl = async () => {
    if (!selectedQR) return;
    setEditError(null);
    setIsUpdatingUrl(true);
    
    try {
      // Basic validation
      new URL(editedUrl);
    } catch {
      setEditError('Please enter a valid URL (including http:// or https://)');
      setIsUpdatingUrl(false);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/qr-codes/${selectedQR._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: editedUrl })
      });
      
      const data = await response.json();
      if (data.success) {
        // Update local modal state
        setSelectedQR(data.qrCode);
        setIsEditingUrl(false);
        // Refresh the main library list
        await fetchQRCodes();
      } else {
        setEditError(data.message || 'Failed to update URL');
      }
    } catch (err) {
      console.error(err);
      setEditError('Server error occurred during update');
    } finally {
      setIsUpdatingUrl(false);
    }
  };

  const downloadQR = (qr: QRCodeType, overrideImage?: string) => {
    const link = document.createElement('a');
    link.download = `${qr.name}-${Date.now()}.png`;
    link.href = overrideImage || qr.image;
    link.click();
  };

  const downloadSVG = (qr: QRCodeType, overrideImage?: string) => {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <image href="${overrideImage || qr.image}" width="400" height="400" />
    </svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${qr.name}-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = (qr: QRCodeType, overrideImage?: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${qr.name}</title>
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
                body { margin: 0; }
                img { width: 100%; height: auto; }
              }
            </style>
          </head>
          <body>
            <img src="${overrideImage || qr.image}" onload="window.print();window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const getUniqueTypes = () => {
    const types = qrCodes.map(qr => qr.type);
    return ['all', ...Array.from(new Set(types))];
  };

  const getWorkspaceName = (workspaceId?: string) => {
    if (!workspaceId) return 'Personal Space';
    const ws = workspaces.find(w => w._id === workspaceId);
    return ws ? ws.name : 'Shared Team';
  };

  // Helper to draw clean SVG charts for Line Chart
  const renderLineChart = (data: Array<{ _id: string; count: number }>) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Activity className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-500">No scans logged in the last 30 days</span>
        </div>
      );
    }

    const width = 450;
    const height = 180;
    const padding = 35;
    const maxVal = Math.max(...data.map(d => d.count), 5);
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((d, index) => {
      const x = padding + (data.length > 1 ? (index / (data.length - 1)) * chartWidth : chartWidth / 2);
      const y = padding + chartHeight - (d.count / maxVal) * chartHeight;
      return { x, y, label: d._id, val: d.count };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = points.length > 0 
      ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` 
      : '';

    return (
      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Scan History (Last 30 Days)</h4>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Y Axis Grid lines */}
          {[0, 0.5, 1].map((ratio, idx) => {
            const y = padding + chartHeight * ratio;
            const val = Math.round(maxVal * (1 - ratio));
            return (
              <g key={idx} className="opacity-40">
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeDasharray="3" />
                <text x={padding - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-500 font-semibold">{val}</text>
              </g>
            );
          })}

          {/* Area under the line */}
          {areaD && <path d={areaD} fill="url(#chartGrad)" />}

          {/* Line Path */}
          {pathD && <path d={pathD} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Data Circles */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle cx={p.x} cy={p.y} r="4.5" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx={p.x} cy={p.y} r="9" fill="#f97316" className="opacity-0 group-hover:opacity-20 transition-opacity" />
              <title>{`${p.label}: ${p.val} scan(s)`}</title>
            </g>
          ))}

          {/* X Axis Labels */}
          {points.length > 0 && [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]].map((p, idx) => {
            if (!p) return null;
            return (
              <text key={idx} x={p.x} y={height - padding + 18} textAnchor="middle" className="text-[10px] fill-gray-400 font-medium">
                {p.label.slice(5)} {/* Show MM-DD */}
              </text>
            );
          })}
        </svg>
      </div>
    );
  };

  // Helper to draw clean progress bars for distribution stats
  const renderDistributionList = (
    title: string, 
    items: Array<{ _id: string; count: number }>, 
    icon: React.ComponentType<{ className?: string }>
  ) => {
    const Icon = icon;
    const totalCount = items.reduce((acc, curr) => acc + curr.count, 0);

    return (
      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-gray-100">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h4>
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
        
        {items.length === 0 ? (
          <div className="text-center py-4 text-xs text-gray-400">No data available</div>
        ) : (
          <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
            {items.map((item, index) => {
              const label = item._id || 'Unknown';
              const pct = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-700 truncate max-w-[150px]">{label}</span>
                    <span className="text-gray-500 font-semibold">{item.count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-200 text-center">
        <div className="mb-6">
          <FolderOpen className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">QR Code Library</h2>
          <p className="text-gray-600 text-lg mb-6">Sign in to save and manage your QR codes</p>
        </div>
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Create an account to access:</h3>
          <ul className="text-sm text-gray-600 space-y-2 text-left max-w-md mx-auto">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
              QR code storage and organization
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
              Cloud synchronization
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
              Team collaboration features
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
              Advanced analytics and insights
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Library Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
              <FolderOpen className="w-8 h-8 text-orange-600 mr-3" />
              Your QR Library
            </h2>
            <p className="text-gray-600 text-lg">Manage and organize all your QR codes</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="text-right">
              <div className="text-3xl font-bold text-orange-600">{qrCodes.length}</div>
              <div className="text-sm text-gray-500">Total Codes</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">{filteredQRCodes.length}</div>
              <div className="text-sm text-gray-500">Filtered</div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search QR codes by name or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 appearance-none bg-white"
              >
                {getUniqueTypes().map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-orange-600' : 'hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-orange-600' : 'hover:bg-gray-200 text-gray-600'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Drop Zone */}
      <QRDropZone />

      {/* QR Codes Grid/List */}
      {filteredQRCodes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 border border-orange-200 text-center">
          <div className="text-gray-400 mb-6">
            {searchTerm || filterType !== 'all' ? (
              <Search className="w-16 h-16 mx-auto mb-4" />
            ) : (
              <FolderOpen className="w-16 h-16 mx-auto mb-4" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            {searchTerm || filterType !== 'all' ? 'No matching QR codes' : 'No QR codes yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'Start by generating your first QR code or drop an image to scan.'
            }
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
          : 'space-y-4'
        }>
          {filteredQRCodes.map((qr) => (
            <div
              key={qr._id}
              className={`bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${
                viewMode === 'list' ? 'flex items-center p-6' : 'p-6'
              }`}
            >
              <div className={viewMode === 'list' ? 'flex-1' : ''}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-800 mb-1 truncate">{qr.name}</h3>
                      {qr.isDynamic && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold tracking-wide">
                          Dynamic
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 capitalize">{qr.type}</p>
                  </div>
                  {viewMode === 'list' && (
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(qr.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <div className="mb-4">
                  <img 
                    src={qr.image} 
                    alt={qr.name} 
                    className={`rounded-lg shadow-sm border border-gray-100 ${
                      viewMode === 'list' ? 'w-16 h-16' : 'w-full h-48 object-contain bg-gray-50 p-2'
                    }`}
                  />
                </div>
                
                {viewMode === 'grid' && (
                  <p className="text-xs text-gray-400 mb-4">
                    Created {new Date(qr.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              <div className={`flex space-x-2 ${viewMode === 'list' ? 'ml-4' : ''}`}>
                <button
                  onClick={() => setSelectedQR(qr)}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
                >
                  <span className="text-sm font-medium">Details</span>
                </button>
                <button
                  onClick={() => downloadQR(qr)}
                  className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"
                  title="Download QR Code"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    const confirmed = await confirm('Delete QR Code', 'Are you sure you want to delete this QR code?', { isDanger: true });
                    if (confirmed) {
                      deleteQR(qr._id);
                    }
                  }}
                  className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105"
                  title="Delete QR Code"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Advanced Full Screen/Large Modal with Analytics Drawer */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative animate-slideUp">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-gray-800">{selectedQR.name}</h2>
                  {selectedQR.isDynamic && (
                    <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-extrabold tracking-wide uppercase">
                      Dynamic Code
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1 capitalize">Category: {selectedQR.type} • Workspace: {getWorkspaceName(selectedQR.workspaceId)}</p>
              </div>
              <button
                onClick={() => setSelectedQR(null)}
                className="p-2.5 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Tab switch bar */}
            <div className="flex bg-white px-6 border-b border-gray-150">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-all flex items-center space-x-2 ${
                  activeTab === 'info'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>Information & Actions</span>
              </button>
              
              <button
                onClick={() => setActiveTab('analytics')}
                disabled={!selectedQR.isDynamic}
                className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-all flex items-center space-x-2 ${
                  !selectedQR.isDynamic
                    ? 'opacity-40 cursor-not-allowed text-gray-400'
                    : activeTab === 'analytics'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                title={!selectedQR.isDynamic ? "Analytics are only tracked for Dynamic QR Codes" : ""}
              >
                <Activity className="w-4 h-4" />
                <span>Scan Analytics</span>
                {!selectedQR.isDynamic && (
                  <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    Static
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {activeTab === 'info' ? (
                <div className="grid md:grid-cols-12 gap-8">
                  {/* Left block - QR Image & Download */}
                  <div className="md:col-span-5 flex flex-col items-center space-y-6 bg-white p-6 rounded-xl border border-gray-150 shadow-sm">
                    <img 
                      src={qrImageURL} 
                      alt={selectedQR.name} 
                      className="w-full max-w-[240px] aspect-square object-contain bg-gray-50 p-3 rounded-lg border border-gray-100" 
                    />
                    
                    <div className="w-full space-y-3">
                      <div className="relative">
                        <button
                          onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
                          className="w-full flex items-center justify-center space-x-2.5 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-semibold transition-all shadow-md"
                        >
                          <Download className="w-4 h-4" />
                          <span>Export Options</span>
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        
                        {isDownloadDropdownOpen && (
                          <div className="absolute left-0 bottom-full mb-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 py-2.5 z-50">
                            <button
                              onClick={() => {
                                downloadQR(selectedQR, qrImageURL);
                                setIsDownloadDropdownOpen(false);
                              }}
                              className="flex items-center space-x-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 transition-colors text-left"
                            >
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              <span>PNG Image (Standard)</span>
                            </button>
                            <button
                              onClick={() => {
                                downloadSVG(selectedQR, qrImageURL);
                                setIsDownloadDropdownOpen(false);
                              }}
                              className="flex items-center space-x-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 transition-colors text-left"
                            >
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              <span>SVG Vector (Scalable)</span>
                            </button>
                            <button
                              onClick={() => {
                                downloadPDF(selectedQR, qrImageURL);
                                setIsDownloadDropdownOpen(false);
                              }}
                              className="flex items-center space-x-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 transition-colors text-left"
                            >
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              <span>PDF Document (Print)</span>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={async () => {
                          const confirmed = await confirm('Delete QR Code', 'Are you sure you want to delete this QR code?', { isDanger: true });
                          if (confirmed) {
                            deleteQR(selectedQR._id);
                            setSelectedQR(null);
                          }
                        }}
                        className="w-full flex items-center justify-center space-x-2.5 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Code</span>
                      </button>
                    </div>
                  </div>

                  {/* Right block - Settings, Content & Workspace details */}
                  <div className="md:col-span-7 space-y-6">
                    {/* Content Section */}
                    <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <Link className="w-5 h-5 text-orange-600 mr-2" />
                        QR Code Contents
                      </h3>

                      {selectedQR.isDynamic ? (
                        <div className="space-y-4">
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                              Target Destination URL
                            </span>
                            {isEditingUrl ? (
                              <div className="space-y-2">
                                <input
                                  type="url"
                                  value={editedUrl}
                                  onChange={(e) => setEditedUrl(e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                  placeholder="https://example.com/new-path"
                                />
                                {editError && (
                                  <p className="text-xs text-red-600 font-semibold">{editError}</p>
                                )}
                                <div className="flex space-x-2">
                                  <button
                                    onClick={handleUpdateTargetUrl}
                                    disabled={isUpdatingUrl}
                                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center space-x-2"
                                  >
                                    {isUpdatingUrl ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    <span>Save Target</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setIsEditingUrl(false);
                                      setEditedUrl(selectedQR.targetUrl || selectedQR.content);
                                    }}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between bg-orange-50/30 border border-orange-100 p-3.5 rounded-xl">
                                <div className="break-all text-sm font-medium text-gray-800 pr-4">
                                  {selectedQR.targetUrl || selectedQR.content}
                                </div>
                                <button
                                  onClick={() => setIsEditingUrl(true)}
                                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-sm"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                                  <span>Edit URL</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                              Shortened Scan Redirect Link
                            </span>
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <span className="text-xs font-mono text-gray-600 select-all truncate pr-3">{selectedQR.content}</span>
                              <button
                                onClick={async () => {
                                  navigator.clipboard.writeText(selectedQR.content);
                                  await alert('Link Copied', 'Redirect link copied successfully!');
                                }}
                                className="p-1 hover:bg-gray-200 rounded text-gray-500"
                                title="Copy redirect URL"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Raw Encoded Data</span>
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-48 overflow-y-auto text-sm font-mono break-all text-gray-700 whitespace-pre-wrap">
                            {selectedQR.content}
                          </div>
                          <button
                            onClick={async () => {
                              navigator.clipboard.writeText(selectedQR.content);
                              await alert('Data Copied', 'Raw data copied successfully!');
                            }}
                            className="flex items-center space-x-1.5 text-xs text-orange-600 hover:text-orange-700 font-semibold"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Encoded Data</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Metadata, Created info, customization values */}
                    <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <Info className="w-5 h-5 text-orange-600 mr-2" />
                        Code Information & Attributes
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="text-xs text-gray-400 block mb-0.5">Date Created</span>
                          <span className="font-semibold text-gray-700">{new Date(selectedQR.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="text-xs text-gray-400 block mb-0.5">Scan Count</span>
                          <span className="font-semibold text-gray-700">{selectedQR.scanCount || 0} scans</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="text-xs text-gray-400 block mb-0.5">QR Type</span>
                          <span className="font-semibold text-gray-700 capitalize">{selectedQR.type}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="text-xs text-gray-400 block mb-0.5">Workspace</span>
                          <span className="font-semibold text-gray-700">{getWorkspaceName(selectedQR.workspaceId)}</span>
                        </div>
                      </div>

                      {selectedQR.customization && (
                        <div className="border-t border-gray-100 pt-4 mt-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Visual Customization</span>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                              FG: {selectedQR.customization.foregroundColor || '#000000'}
                            </span>
                            <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                              BG: {selectedQR.customization.backgroundColor || '#FFFFFF'}
                            </span>
                            {selectedQR.customization.eyeStyle && (
                              <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium capitalize">
                                Eyes: {selectedQR.customization.eyeStyle}
                              </span>
                            )}
                            {selectedQR.customization.patternStyle && (
                              <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium capitalize">
                                Pattern: {selectedQR.customization.patternStyle}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Analytics Dashboard Tab */
                <div className="space-y-6">
                  {loadingAnalytics ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                      <p className="text-gray-600 font-semibold">Fetching scan logs and processing metrics...</p>
                    </div>
                  ) : analyticsError ? (
                    <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-center">
                      <Info className="w-12 h-12 text-red-500 mx-auto mb-3" />
                      <h4 className="text-lg font-bold text-red-800 mb-1">Could Not Load Analytics</h4>
                      <p className="text-red-600 mb-4">{analyticsError}</p>
                      <button
                        onClick={() => fetchAnalytics(selectedQR._id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-all"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : analyticsData ? (
                    <>
                      {/* Summary Metrics Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm text-center">
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Total Scans</span>
                          <span className="text-3xl font-extrabold text-orange-600">
                            {analyticsData.timeSeries.reduce((acc, c) => acc + c.count, 0)}
                          </span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm text-center">
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Top Device</span>
                          <span className="text-xl font-bold text-gray-800 truncate block">
                            {analyticsData.devices[0]?._id || 'None'}
                          </span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm text-center">
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Top Browser</span>
                          <span className="text-xl font-bold text-gray-800 truncate block">
                            {analyticsData.browsers[0]?._id || 'None'}
                          </span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm text-center">
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Top Location</span>
                          <span className="text-xl font-bold text-gray-800 truncate block">
                            {analyticsData.countries[0]?._id || 'None'}
                          </span>
                        </div>
                      </div>

                      {/* Main Charts area */}
                      <div className="space-y-6">
                        {/* 30-day Time Series Line chart */}
                        {renderLineChart(analyticsData.timeSeries)}

                        {/* Side breakdown lists */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {renderDistributionList('Device Types', analyticsData.devices, Smartphone)}
                          {renderDistributionList('Web Browsers', analyticsData.browsers, Chrome)}
                          {renderDistributionList('Operating Systems', analyticsData.os, Laptop)}
                          {renderDistributionList('Scans by Country', analyticsData.countries, Globe)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-20 text-gray-500">
                      No analytics data available
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end space-x-2 text-xs text-gray-400 font-medium">
              <span>QR Code ID: {selectedQR._id}</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}