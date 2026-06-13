import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QRGenerator } from './components/QRGenerator';
import { QRLibrary } from './components/QRLibrary';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { QRScannerModal } from './components/QRScannerModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { QRProvider } from './context/QRContext';
import { Sparkles, TrendingUp, Zap, Shield, Users, Clock } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'generate' | 'library'>('generate');
  const [showAuthModal, setShowAuthModal] = useState<'login' | 'register' | false>(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleSwitchToLibrary = () => setActiveTab('library');
    window.addEventListener('switchToLibrary', handleSwitchToLibrary);
    return () => window.removeEventListener('switchToLibrary', handleSwitchToLibrary);
  }, []);

  const handleTabChange = (tab: 'generate' | 'library') => {
    setIsLoading(true);
    setActiveTab(tab);
    // Simulate loading for better UX
    setTimeout(() => setIsLoading(false), 300);
  };

  const features = [
    {
      icon: Sparkles,
      title: "Smart QR Generation",
      description: "Create QR codes for any content type with advanced customization"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data stays on your device with end-to-end encryption"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Share and manage QR codes with your team seamlessly"
    },
    {
      icon: Clock,
      title: "Real-time Sync",
      description: "Access your QR codes anywhere with cloud synchronization"
    }
  ];

  const stats = [
    { label: "QR Codes Generated", value: "10,000+", icon: TrendingUp },
    { label: "Active Users", value: "5,000+", icon: Users },
    { label: "Countries", value: "50+", icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <Header 
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onSignInClick={() => setShowAuthModal('login')}
        onSettingsClick={() => setShowSettingsModal(true)}
        onScanClick={() => setShowScannerModal(true)}
      />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section for non-authenticated users */}
        {!user && (
          <div className="mb-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
                Create, Manage & Share
                <span className="block text-orange-600">QR Codes Instantly</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                The most powerful QR code generator with advanced features, secure storage, 
                and seamless collaboration for teams and individuals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowAuthModal('register')}
                  className="px-8 py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => handleTabChange('generate')}
                  className="px-8 py-4 border-2 border-orange-600 text-orange-600 rounded-xl hover:bg-orange-50 transition-all duration-300"
                >
                  Try Demo
                </button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-orange-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <feature.icon className="w-12 h-12 text-orange-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Stats Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-orange-200">
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">Trusted by Thousands</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <stat.icon className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</div>
                    <div className="text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className={`transition-all duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          {activeTab === 'generate' ? (
            <div className="space-y-6">
              {/* Welcome Banner for authenticated users */}
              {user && (
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Welcome back, {user.name}! 👋</h2>
                      <p className="text-orange-100">Ready to create your next QR code?</p>
                    </div>
                    <div className="hidden md:block">
                      <div className="text-right">
                        <div className="text-3xl font-bold">{user.qrCodesCount || 0}</div>
                        <div className="text-orange-100 text-sm">QR Codes Created</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <QRGenerator />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Library Header */}
              {user && (
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">Your QR Library</h2>
                      <p className="text-gray-600">Manage and organize all your QR codes</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">{user.qrCodesCount || 0}</div>
                      <div className="text-sm text-gray-500">Total Codes</div>
                    </div>
                  </div>
                </div>
              )}
              
              <QRLibrary />
            </div>
          )}
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4 text-center">Loading...</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/90 backdrop-blur-sm border-t border-orange-200 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">QRVault</h3>
              <p className="text-gray-600 text-sm">
                The most powerful QR code generator with advanced features and secure storage.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-4">Features</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>QR Code Generation</li>
                <li>Secure Storage</li>
                <li>Team Collaboration</li>
                <li>Cloud Sync</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-4">Support</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>API Documentation</li>
                <li>Privacy Policy</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-4">Connect</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>Twitter</li>
                <li>LinkedIn</li>
                <li>GitHub</li>
                <li>Blog</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
            © 2024 QRVault. All rights reserved.
          </div>
        </div>
      </footer>

      {showAuthModal && (
        <AuthModal initialMode={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
      
      {showSettingsModal && user && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {showScannerModal && (
        <QRScannerModal onClose={() => setShowScannerModal(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <QRProvider>
        <AppContent />
      </QRProvider>
    </AuthProvider>
  );
}

export default App;