import { useState, useRef, useEffect } from 'react';
import { 
  QrCode, 
  Library, 
  Settings, 
  User, 
  ScanLine, 
  Menu, 
  X, 
  Bell, 
  Sparkles,
  LogOut,
  ChevronDown,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQR } from '../context/QRContext';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeTab: 'generate' | 'library';
  setActiveTab: (tab: 'generate' | 'library') => void;
  onSignInClick: () => void;
  onSettingsClick: () => void;
  onScanClick: () => void;
}

export function Header({ activeTab, setActiveTab, onSignInClick, onSettingsClick, onScanClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace, createWorkspace, addWorkspaceMember } = useQR();
  const { alert } = useDialog();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [notificationsList, setNotificationsList] = useState([
    {
      id: 1,
      title: "Welcome to QRVault!",
      description: "Explore the single & bulk QR generator to get started.",
      time: "2 hours ago",
      isUnread: true,
      category: "system"
    },
    {
      id: 2,
      title: "Weekly Scan Report Ready",
      description: "Your dynamic links received 124 new clicks this week.",
      time: "1 day ago",
      isUnread: true,
      category: "report"
    },
    {
      id: 3,
      title: "Security Update",
      description: "Two-Factor Authentication is now available for your account.",
      time: "3 days ago",
      isUnread: false,
      category: "security"
    }
  ]);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setIsWorkspaceMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notificationsList.filter(n => n.isUnread).length;

  const handleTabChange = (tab: 'generate' | 'library') => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-orange-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img src="/logo.png" alt="QRVault Logo" className="w-10 h-10 object-contain rounded-xl shadow-lg border border-orange-200" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                QRVault
                <Sparkles className="w-5 h-5 text-orange-500 ml-2" />
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">Advanced QR Code Generator</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-2">
            <button
              onClick={() => handleTabChange('generate')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'generate'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span className="font-medium">Generate</span>
            </button>

            <button
              onClick={() => handleTabChange('library')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'library'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
              }`}
            >
              <Library className="w-5 h-5" />
              <span className="font-medium">Library</span>
            </button>

            <button
              onClick={onScanClick}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all duration-300 transform hover:scale-105"
            >
              <ScanLine className="w-5 h-5" />
              <span className="font-medium">Scan QR</span>
            </button>
          </nav>

          {/* Desktop User Section */}
          <div className="hidden lg:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Workspace Selector */}
                <div className="relative mr-2" ref={workspaceMenuRef}>
                  <button
                    onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                    className="flex items-center space-x-2 px-4 py-2 border border-orange-200 dark:border-zinc-850 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/25 transition-all duration-300 text-sm font-medium text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 shadow-sm"
                  >
                    <span className="truncate max-w-[120px]">
                      {currentWorkspace ? currentWorkspace.name : 'Personal Workspace'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isWorkspaceMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isWorkspaceMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-2xl shadow-2xl py-2 z-50 animate-slideUp backdrop-blur-md text-zinc-800 dark:text-zinc-100">
                      <div className="px-4 py-2.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 uppercase tracking-wider">
                        Workspaces
                      </div>
                      <div className="max-h-48 overflow-y-auto py-1.5 space-y-0.5">
                        <button
                          onClick={() => {
                            setCurrentWorkspace(null);
                            setIsWorkspaceMenuOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left transition-colors ${
                            currentWorkspace === null
                              ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-500 font-semibold'
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-orange-50/70 dark:hover:bg-orange-950/10'
                          }`}
                        >
                          <span>Personal Workspace</span>
                        </button>

                        {workspaces.map((workspace) => (
                          <button
                            key={workspace._id}
                            onClick={() => {
                              setCurrentWorkspace(workspace);
                              setIsWorkspaceMenuOpen(false);
                            }}
                            className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left transition-colors ${
                              currentWorkspace?._id === workspace._id
                                ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-500 font-semibold'
                                : 'text-zinc-700 dark:text-zinc-300 hover:bg-orange-50/70 dark:hover:bg-orange-950/10'
                            }`}
                          >
                            <span className="truncate">{workspace.name}</span>
                            <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full capitalize font-medium">
                              {workspace.role}
                            </span>
                          </button>
                        ))}
                      </div>
                      
                      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-1 px-2 space-y-1">
                        <button
                          onClick={() => {
                            setShowCreateWorkspaceModal(true);
                            setIsWorkspaceMenuOpen(false);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-xs text-orange-600 dark:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-xl font-bold transition-all"
                        >
                          <span>+ Create Workspace</span>
                        </button>
                        
                        {currentWorkspace && (currentWorkspace.role === 'owner' || currentWorkspace.role === 'admin') && (
                          <button
                            onClick={() => {
                              setShowInviteModal(true);
                              setIsWorkspaceMenuOpen(false);
                            }}
                            className="flex items-center space-x-2 w-full px-3 py-2 text-xs text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 rounded-xl font-bold transition-all"
                          >
                            <span>Invite Members</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Theme Toggle */}
                <button
                  id="theme-toggle-btn"
                  onClick={toggleTheme}
                  title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-2 rounded-xl text-gray-600 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all duration-300"
                >
                  {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Notifications */}
                <div className="relative" ref={notificationsRef}>
                  <button 
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="relative p-2 rounded-xl text-gray-600 hover:text-orange-600 dark:hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all duration-300"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse"></div>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-2xl shadow-2xl py-2 z-50 animate-slideUp backdrop-blur-md text-zinc-800 dark:text-zinc-100">
                      <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/20 rounded-t-xl">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Notifications</span>
                        {unreadCount > 0 && (
                          <button 
                            onClick={() => {
                              setNotificationsList(prev => prev.map(n => ({ ...n, isUnread: false })));
                            }}
                            className="text-[10px] text-orange-600 dark:text-orange-500 hover:underline font-bold"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-850 p-1">
                        {notificationsList.length === 0 ? (
                          <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                            No notifications yet
                          </div>
                        ) : (
                          notificationsList.map(n => {
                            let IconComponent = Sparkles;
                            let iconColorClass = "text-orange-600 bg-orange-50 dark:bg-orange-950/30";
                            if (n.category === 'report') {
                              IconComponent = Library;
                              iconColorClass = "text-green-600 bg-green-50 dark:bg-green-950/20";
                            } else if (n.category === 'security') {
                              IconComponent = Settings;
                              iconColorClass = "text-blue-600 bg-blue-50 dark:bg-blue-950/20";
                            }
                            
                            return (
                              <button
                                key={n.id}
                                onClick={() => {
                                  setNotificationsList(prev => prev.map(item => item.id === n.id ? { ...item, isUnread: false } : item));
                                }}
                                className={`flex items-start space-x-3 w-full p-2.5 text-left rounded-xl transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 relative ${
                                  n.isUnread ? 'bg-orange-50/10 dark:bg-orange-950/5' : ''
                                }`}
                              >
                                <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${iconColorClass}`}>
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex justify-between items-start">
                                    <span className={`text-xs font-bold truncate ${n.isUnread ? 'text-zinc-900 dark:text-zinc-550' : 'text-zinc-700 dark:text-zinc-400'}`}>{n.title}</span>
                                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 flex-shrink-0 ml-1.5 mt-0.5">{n.time}</span>
                                  </div>
                                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{n.description}</p>
                                </div>
                                {n.isUnread && (
                                  <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 bg-orange-600 dark:bg-orange-500 rounded-full"></div>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-3 p-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all duration-300 text-left"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-800 dark:text-zinc-200">{user.name}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">{user.accountType === 'business' ? 'Business Plan' : 'Free Plan'}</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-2xl shadow-2xl py-2.5 z-50 animate-slideUp backdrop-blur-md text-zinc-800 dark:text-zinc-100">
                      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center space-x-3 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-t-xl">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">{user.name}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</div>
                          <span className="inline-block text-[9px] bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 font-bold px-1.5 py-0.5 rounded-full mt-1">
                            {user.accountType === 'business' ? 'Business Plan' : 'Free Plan'}
                          </span>
                        </div>
                      </div>
                      <div className="p-1.5 space-y-1">
                        <button
                          onClick={() => {
                            onSettingsClick();
                            setIsUserMenuOpen(false);
                          }}
                          className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-orange-950/25 hover:text-orange-600 dark:hover:text-orange-500 rounded-xl transition-all duration-200 group"
                        >
                          <Settings className="w-4 h-4 text-zinc-400 group-hover:text-orange-500 group-hover:rotate-45 transition-all duration-300" />
                          <span>Settings</span>
                        </button>
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all duration-200 group"
                        >
                          <LogOut className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                {/* Theme Toggle (guest) */}
                <button
                  id="theme-toggle-guest-btn"
                  onClick={toggleTheme}
                  title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-2 rounded-xl text-gray-600 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all duration-300"
                >
                  {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                  onClick={onScanClick}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all duration-300"
                >
                  <ScanLine className="w-4 h-4" />
                  <span className="font-medium">Scan</span>
                </button>
                <button
                  onClick={onSignInClick}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Sign In</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all duration-300"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 bg-white rounded-xl shadow-lg border border-orange-200 p-4">
            <div className="space-y-2">
              <button
                onClick={() => handleTabChange('generate')}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === 'generate'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                    : 'text-gray-600 hover:bg-orange-50'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span className="font-medium">Generate QR Code</span>
              </button>

              <button
                onClick={() => handleTabChange('library')}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === 'library'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                    : 'text-gray-600 hover:bg-orange-50'
                }`}
              >
                <Library className="w-5 h-5" />
                <span className="font-medium">QR Library</span>
              </button>

              <button
                onClick={onScanClick}
                className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-gray-600 hover:bg-orange-50 transition-all duration-300"
              >
                <ScanLine className="w-5 h-5" />
                <span className="font-medium">Scan QR Code</span>
              </button>

              {user ? (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex items-center space-x-3 px-4 py-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.accountType === 'business' ? 'Business Plan' : 'Free Plan'}</div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <button
                      onClick={onSettingsClick}
                      className="flex items-center space-x-3 w-full px-4 py-2 rounded-lg text-gray-600 hover:bg-orange-50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 w-full px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <button
                    onClick={onSignInClick}
                    className="flex items-center space-x-2 w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300"
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium">Sign In</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm lg:hidden z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspaceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-orange-100 transform transition-all">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Create New Workspace</h3>
            <input
              type="text"
              placeholder="e.g. Marketing Team"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-6 text-sm"
            />
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowCreateWorkspaceModal(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (newWorkspaceName.trim()) {
                    await createWorkspace(newWorkspaceName);
                    setNewWorkspaceName('');
                    setShowCreateWorkspaceModal(false);
                  }
                }}
                className="px-4 py-2.5 bg-orange-600 text-white hover:bg-orange-700 rounded-xl transition-all font-medium text-sm shadow-md"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && currentWorkspace && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-orange-100 transform transition-all">
            <h3 className="text-xl font-bold text-gray-800 mb-1">Invite Member</h3>
            <p className="text-xs text-gray-500 mb-4">Invite colleagues to collaborate on "{currentWorkspace.name}"</p>
            <input
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-6 text-sm"
            />
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (inviteEmail.trim()) {
                    try {
                      await addWorkspaceMember(currentWorkspace._id, inviteEmail);
                      setInviteEmail('');
                      setShowInviteModal(false);
                      await alert('Invitation Sent', 'Invitation sent successfully!');
                    } catch (err: any) {
                      await alert('Invitation Failed', err.message || 'Failed to add member');
                    }
                  }
                }}
                className="px-4 py-2.5 bg-orange-600 text-white hover:bg-orange-700 rounded-xl transition-all font-medium text-sm shadow-md"
              >
                Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}