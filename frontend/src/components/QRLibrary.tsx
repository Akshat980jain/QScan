import React, { useState } from 'react';
import { Search, Download, Trash2, Grid, List, FolderOpen, Plus, Filter } from 'lucide-react';
import { useQR } from '../context/QRContext';
import { useAuth } from '../context/AuthContext';
import { QRDropZone } from './QRDropZone';
import type { QRCode as QRCodeType } from '../context/QRContext';

export function QRLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<string>('all');
  const { qrCodes, deleteQR } = useQR();
  const { user } = useAuth();
  const [selectedQR, setSelectedQR] = useState<QRCodeType | null>(null);

  const filteredQRCodes = qrCodes.filter(qr => {
    const matchesSearch = qr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         qr.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || qr.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const downloadQR = (qr: QRCodeType) => {
    const link = document.createElement('a');
    link.download = `${qr.name}.png`;
    link.href = qr.image;
    link.click();
  };

  const getUniqueTypes = () => {
    const types = qrCodes.map(qr => qr.type);
    return ['all', ...Array.from(new Set(types))];
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
      {/* Enhanced Header */}
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

      {/* Drop Zone */}
      <QRDropZone />

      {/* QR Codes Display */}
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
          {!searchTerm && filterType === 'all' && (
            <button className="inline-flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all duration-300 transform hover:scale-105">
              <Plus className="w-5 h-5" />
              <span>Create Your First QR Code</span>
            </button>
          )}
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
                    <h3 className="font-semibold text-gray-800 mb-1 truncate">{qr.name}</h3>
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
                    className={`rounded-lg shadow-sm ${
                      viewMode === 'list' ? 'w-16 h-16' : 'w-full h-48 object-cover'
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
                  onClick={() => deleteQR(qr._id)}
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

      {/* Enhanced Details Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setSelectedQR(null)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-2xl">&times;</span>
            </button>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedQR.name}</h2>
              <p className="text-sm text-gray-500 capitalize">Type: {selectedQR.type}</p>
              <p className="text-xs text-gray-400 mt-1">
                Created {new Date(selectedQR.createdAt).toLocaleString()}
              </p>
            </div>
            
            <div className="flex justify-center mb-6">
              <img 
                src={selectedQR.image} 
                alt={selectedQR.name} 
                className="w-64 h-64 rounded-xl shadow-lg" 
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => downloadQR(selectedQR)}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button
                onClick={() => {
                  deleteQR(selectedQR._id);
                  setSelectedQR(null);
                }}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}