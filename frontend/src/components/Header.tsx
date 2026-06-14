import { useState } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQR } from '../context/QRContext';
import { useDialog } from '../context/DialogContext';

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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

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
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <QrCode className="w-6 h-6 text-white" />
              </div>
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
                <div className="relative mr-2">
                  <button
                    onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                    className="flex items-center space-x-2 px-4 py-2 border border-orange-200 rounded-xl hover:bg-orange-50 transition-all duration-300 text-sm font-medium text-gray-700 bg-white shadow-sm"
                  >
                    <span className="truncate max-w-[120px]">
                      {currentWorkspace ? currentWorkspace.name : 'Personal Workspace'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>

                  {isWorkspaceMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                        Workspaces
                      </div>
                      <div className="max-h-48 overflow-y-auto py-1">
                        <button
                          onClick={() => {
                            setCurrentWorkspace(null);
                            setIsWorkspaceMenuOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left ${
                            currentWorkspace === null
                              ? 'bg-orange-50 text-orange-600 font-medium'
                              : 'text-gray-700 hover:bg-orange-50'
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
                            className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left ${
                              currentWorkspace?._id === workspace._id
                                ? 'bg-orange-50 text-orange-600 font-medium'
                                : 'text-gray-700 hover:bg-orange-50'
                            }`}
                          >
                            <span className="truncate">{workspace.name}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full capitalize">
                              {workspace.role}
                            </span>
                          </button>
                        ))}
                      </div>
                      
                      <div className="border-t border-gray-100 pt-2 mt-1 px-2 space-y-1">
                        <button
                          onClick={() => {
                            setShowCreateWorkspaceModal(true);
                            setIsWorkspaceMenuOpen(false);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-xs text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition-colors"
                        >
                          <span>+ Create Workspace</span>
                        </button>
                        
                        {currentWorkspace && (currentWorkspace.role === 'owner' || currentWorkspace.role === 'admin') && (
                          <button
                            onClick={() => {
                              setShowInviteModal(true);
                              setIsWorkspaceMenuOpen(false);
                            }}
                            className="flex items-center space-x-2 w-full px-3 py-2 text-xs text-green-600 hover:bg-green-50 rounded-lg font-medium transition-colors"
                          >
                            <span>Invite Members</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-xl text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all duration-300">
                  <Bell className="w-5 h-5" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-3 p-2 rounded-xl hover:bg-orange-50 transition-all duration-300"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-800">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.accountType === 'business' ? 'Business Plan' : 'Free Plan'}</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-800">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={onSettingsClick}
                          className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </button>
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
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

      {/* Click outside to close user menu */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 bg-transparent z-40"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}

      {/* Click outside to close workspace menu */}
      {isWorkspaceMenuOpen && (
        <div 
          className="fixed inset-0 bg-transparent z-40"
          onClick={() => setIsWorkspaceMenuOpen(false)}
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