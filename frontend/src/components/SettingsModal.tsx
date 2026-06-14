import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Save, 
  Lock, 
  Shield, 
  Palette, 
  Sliders, 
  Check, 
  AlertCircle,
  Key,
  Laptop,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Copy,
  CheckCircle,
  Moon,
  Sun,
  Monitor,
  Users,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQR } from '../context/QRContext';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsTab = 'profile' | 'security' | 'qr-defaults' | 'workspaces' | 'sessions' | 'api-keys';

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { 
    user, 
    updateProfile, 
    changePassword,
    fetchSessions,
    revokeSession,
    revokeOtherSessions,
    fetchApiKeys,
    createApiKey,
    revokeApiKey
  } = useAuth();
  
  const { workspaces, fetchWorkspaces, createWorkspace, addWorkspaceMember } = useQR();
  const { confirm } = useDialog();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);
  
  // Status Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile/Appearance Tab States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newsletter, setNewsletter] = useState(user?.subscribeToNewsletter || false);
  const [notifications, setNotifications] = useState(user?.receiveNotifications !== false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(user?.theme || 'light');

  // Security Tab States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);

  // QR Style Defaults Tab States
  const [defaultColor, setDefaultColor] = useState(user?.defaultQRColor || '#000000');
  const [defaultBgColor, setDefaultBgColor] = useState(user?.defaultQRBgColor || '#FFFFFF');
  const [defaultEye, setDefaultEye] = useState<'square' | 'circle' | 'rounded'>(
    (user?.defaultQREyeStyle as any) || 'square'
  );
  const [defaultPattern, setDefaultPattern] = useState<'square' | 'dot' | 'line'>(
    (user?.defaultQRPatternStyle as any) || 'square'
  );

  // Sync state values when user context loads or updates
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setNewsletter(user.subscribeToNewsletter || false);
      setNotifications(user.receiveNotifications !== false);
      setTheme(user.theme || 'light');
      setDefaultColor(user.defaultQRColor || '#000000');
      setDefaultBgColor(user.defaultQRBgColor || '#FFFFFF');
      setDefaultEye((user.defaultQREyeStyle as any) || 'square');
      setDefaultPattern((user.defaultQRPatternStyle as any) || 'square');
      setTwoFactorEnabled(user.twoFactorEnabled || false);
    }
  }, [user]);

  // Workspace Tab States
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [createWorkspaceLoading, setCreateWorkspaceLoading] = useState(false);

  // Active Sessions States
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Developer API Keys States
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyLoading, setNewKeyLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const clearMessages = () => {
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    const root = window.document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      if (systemTheme === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    }
  };

  const handleClose = () => {
    // Revert DOM theme to saved setting if changed without saving
    const root = window.document.documentElement;
    const savedTheme = user?.theme || 'light';
    if (savedTheme === 'dark') {
      root.classList.add('dark');
    } else if (savedTheme === 'light') {
      root.classList.remove('dark');
    } else {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      if (systemTheme === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    }
    onClose();
  };

  const handle2FAToggle = async (checked: boolean) => {
    setLoading(true);
    clearMessages();
    try {
      await updateProfile({ twoFactorEnabled: checked });
      setSuccessMsg(`Two-Factor Authentication ${checked ? 'enabled' : 'disabled'} successfully!`);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Failed to update 2FA setting');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data depending on active tab
  useEffect(() => {
    if (activeTab === 'sessions') {
      loadSessions();
    } else if (activeTab === 'api-keys') {
      loadApiKeys();
      setGeneratedKey(null);
    } else if (activeTab === 'workspaces') {
      fetchWorkspaces().catch(console.error);
      setSelectedWorkspaceId(null);
    }
  }, [activeTab]);

  // Load Sessions from backend
  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load active sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  // Load API Keys from backend
  const loadApiKeys = async () => {
    setKeysLoading(true);
    try {
      const data = await fetchApiKeys();
      setApiKeys(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load API keys');
    } finally {
      setKeysLoading(false);
    }
  };

  // Load Workspace Members
  const loadWorkspaceMembers = async (workspaceId: string) => {
    setMembersLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setWorkspaceMembers(data.members || []);
      } else {
        setErrorMsg(data.message || 'Failed to load members');
      }
    } catch (err: any) {
      setErrorMsg('Error loading members');
      console.error(err);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWorkspaceId) {
      loadWorkspaceMembers(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      await updateProfile({ 
        name, 
        email,
        subscribeToNewsletter: newsletter,
        receiveNotifications: notifications,
        theme
      });
      setSuccessMsg('Profile and preferences updated successfully!');
      
      // Instantly apply dark mode root changes
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (systemTheme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setSuccessMsg('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleStyleDefaultsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      await updateProfile({
        defaultQRColor: defaultColor,
        defaultQRBgColor: defaultBgColor,
        defaultQREyeStyle: defaultEye,
        defaultQRPatternStyle: defaultPattern
      });
      setSuccessMsg('QR style defaults saved successfully!');
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Failed to save defaults');
    } finally {
      setLoading(false);
    }
  };

  // Workspace Actions
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setCreateWorkspaceLoading(true);
    clearMessages();
    try {
      await createWorkspace(newWorkspaceName);
      setNewWorkspaceName('');
      setSuccessMsg('Workspace created successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create workspace');
    } finally {
      setCreateWorkspaceLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId || !inviteEmail.trim()) return;
    setInviteLoading(true);
    clearMessages();
    try {
      await addWorkspaceMember(selectedWorkspaceId, inviteEmail, inviteRole);
      setInviteEmail('');
      setSuccessMsg('Member invited successfully!');
      loadWorkspaceMembers(selectedWorkspaceId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to invite member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedWorkspaceId) return;
    const confirmed = await confirm('Remove Workspace Member', 'Are you sure you want to remove this member?', { isDanger: true });
    if (!confirmed) return;
    clearMessages();
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/workspaces/${selectedWorkspaceId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setSuccessMsg('Member removed successfully');
        loadWorkspaceMembers(selectedWorkspaceId);
      } else {
        setErrorMsg(result.message || 'Failed to remove member');
      }
    } catch (err: any) {
      setErrorMsg('Error removing member');
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!selectedWorkspaceId || !user) return;
    const confirmed = await confirm('Leave Workspace', 'Are you sure you want to leave this workspace? You will lose access to its QR codes.', { isDanger: true });
    if (!confirmed) return;
    clearMessages();
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/workspaces/${selectedWorkspaceId}/members/${user._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setSuccessMsg('You left the workspace');
        setSelectedWorkspaceId(null);
        await fetchWorkspaces();
      } else {
        setErrorMsg(result.message || 'Failed to leave workspace');
      }
    } catch (err: any) {
      setErrorMsg('Error leaving workspace');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!selectedWorkspaceId) return;
    const confirmed = await confirm('Delete Workspace', 'WARNING: Are you sure you want to permanently delete this workspace? All associated team QR codes will be orphaned.', { isDanger: true });
    if (!confirmed) return;
    clearMessages();
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/workspaces/${selectedWorkspaceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setSuccessMsg('Workspace deleted successfully');
        setSelectedWorkspaceId(null);
        await fetchWorkspaces();
      } else {
        setErrorMsg(result.message || 'Failed to delete workspace');
      }
    } catch (err: any) {
      setErrorMsg('Error deleting workspace');
    }
  };

  // Sessions Actions
  const handleRevokeSession = async (id: string) => {
    const confirmed = await confirm('Log Out Device', 'Are you sure you want to log out of this session?');
    if (!confirmed) return;
    clearMessages();
    try {
      await revokeSession(id);
      setSuccessMsg('Session terminated successfully');
      loadSessions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to revoke session');
    }
  };

  const handleRevokeOthers = async () => {
    const confirmed = await confirm('Log Out Other Devices', 'Are you sure you want to log out of all other devices?');
    if (!confirmed) return;
    clearMessages();
    try {
      await revokeOtherSessions();
      setSuccessMsg('Logged out of all other sessions');
      loadSessions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to revoke other sessions');
    }
  };

  // API Keys Actions
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setNewKeyLoading(true);
    clearMessages();
    try {
      const keyData = await createApiKey(newKeyName);
      setNewKeyName('');
      setGeneratedKey(keyData.rawKey);
      loadApiKeys();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate API key');
    } finally {
      setNewKeyLoading(false);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    const confirmed = await confirm('Revoke API Key', 'Are you sure you want to revoke this API key? Any applications currently using this key will immediately fail to authenticate.', { isDanger: true });
    if (!confirmed) return;
    clearMessages();
    try {
      await revokeApiKey(id);
      setSuccessMsg('API Key revoked successfully');
      loadApiKeys();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to revoke API key');
    }
  };

  const copyToClipboard = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const selectedWorkspace = workspaces.find(w => w._id === selectedWorkspaceId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-65 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col relative animate-slideUp text-zinc-800 dark:text-zinc-100">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
          <div>
            <h2 className="text-xl font-bold flex items-center text-zinc-900 dark:text-zinc-50">
              <Sliders className="w-5 h-5 text-orange-600 dark:text-orange-500 mr-2" />
              Account Settings & Preferences
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage your workspace access, developer API keys, login security, and visual presets</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 dark:text-zinc-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-64 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-800 p-4 space-y-1.5 flex-shrink-0 flex md:flex-col overflow-x-auto md:overflow-x-visible">
            <button
              onClick={() => { setActiveTab('profile'); clearMessages(); }}
              className={`flex items-center space-x-2.5 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:text-orange-600 dark:hover:text-orange-500'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile & Theme</span>
            </button>
            
            <button
              onClick={() => { setActiveTab('security'); clearMessages(); }}
              className={`flex items-center space-x-2.5 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                activeTab === 'security'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:text-orange-600 dark:hover:text-orange-500'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Password & Security</span>
            </button>
            
            <button
              onClick={() => { setActiveTab('qr-defaults'); clearMessages(); }}
              className={`flex items-center space-x-2.5 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                activeTab === 'qr-defaults'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:text-orange-600 dark:hover:text-orange-500'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>QR Style Defaults</span>
            </button>

            <button
              onClick={() => { setActiveTab('workspaces'); clearMessages(); }}
              className={`flex items-center space-x-2.5 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                activeTab === 'workspaces'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:text-orange-600 dark:hover:text-orange-500'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Workspace Manager</span>
            </button>

            <button
              onClick={() => { setActiveTab('sessions'); clearMessages(); }}
              className={`flex items-center space-x-2.5 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                activeTab === 'sessions'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:text-orange-600 dark:hover:text-orange-500'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>Active Sessions</span>
            </button>

            <button
              onClick={() => { setActiveTab('api-keys'); clearMessages(); }}
              className={`flex items-center space-x-2.5 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                activeTab === 'api-keys'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:text-orange-600 dark:hover:text-orange-500'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Developer API Keys</span>
            </button>
          </div>

          {/* Right Form Display */}
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-zinc-900">
            {/* Status alerts */}
            {successMsg && (
              <div className="mb-5 p-3.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 text-sm font-semibold rounded-xl flex items-center">
                <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-955/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm font-semibold rounded-xl flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* PROFILE & APPEARANCE TAB */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Profile & Appearance</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure your user information and visual dashboard preferences</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Membership Tier</span>
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-500 block mt-0.5">
                      {user?.accountType === 'business' ? 'Business Plan' : 'Free Plan'}
                    </span>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Workspace Teams</span>
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 block mt-0.5">{workspaces.length} shared team(s)</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-zinc-950 text-sm"
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-zinc-955 text-sm"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Theme Selection */}
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Display Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleThemeChange('light')}
                      className={`flex items-center justify-center space-x-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                        theme === 'light'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-500 ring-2 ring-orange-500/20 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      <span>Light</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleThemeChange('dark')}
                      className={`flex items-center justify-center space-x-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                        theme === 'dark'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-500 ring-2 ring-orange-500/20 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      <span>Dark</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleThemeChange('system')}
                      className={`flex items-center justify-center space-x-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                        theme === 'system'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-500 ring-2 ring-orange-500/20 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Monitor className="w-4 h-4" />
                      <span>System</span>
                    </button>
                  </div>
                </div>

                {/* Notifications & Toggles */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications}
                      onChange={(e) => setNotifications(e.target.checked)}
                      className="mt-1 rounded text-orange-600 focus:ring-orange-500 h-4 w-4 bg-white dark:bg-zinc-950 border-zinc-350 dark:border-zinc-700"
                    />
                    <div>
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Receive Weekly Scan Reports</span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Receive aggregated click charts of your dynamic links directly in your inbox</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newsletter}
                      onChange={(e) => setNewsletter(e.target.checked)}
                      className="mt-1 rounded text-orange-600 focus:ring-orange-500 h-4 w-4 bg-white dark:bg-zinc-955 border-zinc-350 dark:border-zinc-700"
                    />
                    <div>
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Product Updates & Newsletters</span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Stay informed of visual layouts, system upgrades, and new releases</p>
                    </div>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Saving Settings...' : 'Save Profile & Appearance'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <form onSubmit={handleSecuritySubmit} className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Security Settings</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage password safety and login protection credentials</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Current Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-zinc-950 text-sm"
                        placeholder="Enter current password"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-zinc-955 text-sm"
                        placeholder="Enter new password"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-zinc-955 text-sm"
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-xl flex items-center justify-between">
                  <div className="pr-4">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block">Two-Factor Authentication (2FA)</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Validate login processes using an extra visual device check</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={twoFactorEnabled}
                      onChange={(e) => handle2FAToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Changing Password...' : 'Change Password'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* QR CODE DEFAULT TEMPLATES TAB */}
            {activeTab === 'qr-defaults' && (
              <form onSubmit={handleStyleDefaultsSubmit} className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">QR Code Generation Presets</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Choose default layout settings that will pre-fill the creator workspace automatically</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Default FG Color</label>
                    <input
                      type="color"
                      value={defaultColor}
                      onChange={(e) => setDefaultColor(e.target.value)}
                      className="w-full h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 cursor-pointer p-0.5 bg-white dark:bg-zinc-950"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Default BG Color</label>
                    <input
                      type="color"
                      value={defaultBgColor}
                      onChange={(e) => setDefaultBgColor(e.target.value)}
                      className="w-full h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 cursor-pointer p-0.5 bg-white dark:bg-zinc-955"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Default Eye Border Shape</label>
                  <select
                    value={defaultEye}
                    onChange={(e) => setDefaultEye(e.target.value as any)}
                    className="w-full p-3 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white dark:bg-zinc-955"
                  >
                    <option value="square">Classic Square</option>
                    <option value="circle">Circular Eye</option>
                    <option value="rounded">Rounded Eye</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Default QR Module Pattern</label>
                  <select
                    value={defaultPattern}
                    onChange={(e) => setDefaultPattern(e.target.value as any)}
                    className="w-full p-3 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white dark:bg-zinc-955"
                  >
                    <option value="square">Classic Blocks</option>
                    <option value="dot">Circular Dots</option>
                    <option value="line">Smooth Lines</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Saving Presets...' : 'Save QR Presets'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* WORKSPACES MANAGER TAB */}
            {activeTab === 'workspaces' && (
              <div className="space-y-6">
                {!selectedWorkspaceId ? (
                  <>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Workspace Teams</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">View and manage shared collaborative workspace teams</p>
                      </div>
                    </div>

                    {/* Create Workspace Form */}
                    <form onSubmit={handleCreateWorkspace} className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center space-x-3">
                      <input
                        type="text"
                        placeholder="Create workspace (e.g. Sales Team)"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-zinc-900 text-sm"
                        required
                      />
                      <button
                        type="submit"
                        disabled={createWorkspaceLoading || !newWorkspaceName.trim()}
                        className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center space-x-1"
                      >
                        {createWorkspaceLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <span>Create</span>
                        )}
                      </button>
                    </form>

                    {/* Workspace List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Your Memberships</h4>
                      {workspaces.length === 0 ? (
                        <div className="p-8 text-center text-sm text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                          You are not part of any shared workspaces yet. Use the field above to create one.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {workspaces.map((ws) => (
                            <div key={ws._id} className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 rounded-xl flex justify-between items-center hover:border-orange-300 dark:hover:border-orange-950 transition-colors">
                              <div>
                                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{ws.name}</span>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-orange-600 dark:text-orange-500">{ws.role}</span>
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">• Joined {new Date(ws.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedWorkspaceId(ws._id)}
                                className="px-4 py-2 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold rounded-lg transition-colors"
                              >
                                Manage
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  // Workspace Detail View
                  <div className="space-y-5">
                    <button
                      onClick={() => { setSelectedWorkspaceId(null); clearMessages(); }}
                      className="flex items-center space-x-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors font-semibold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to memberships list</span>
                    </button>

                    <div className="flex justify-between items-start pb-4 border-b border-zinc-100 dark:border-zinc-800">
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{selectedWorkspace?.name}</h3>
                        <span className="inline-block text-[10px] uppercase tracking-wider font-bold text-orange-600 dark:text-orange-500 bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded-full mt-1">
                          Role: {selectedWorkspace?.role}
                        </span>
                      </div>
                      
                      {selectedWorkspace?.role === 'owner' ? (
                        <button
                          onClick={handleDeleteWorkspace}
                          className="flex items-center space-x-1 px-3.5 py-2 bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/30 text-xs font-semibold rounded-lg transition-colors border border-red-200 dark:border-red-900/50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Workspace</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleLeaveWorkspace}
                          className="flex items-center space-x-1 px-3.5 py-2 bg-red-50 dark:bg-red-955/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/30 text-xs font-semibold rounded-lg transition-colors border border-red-200 dark:border-red-900/50"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Leave Workspace</span>
                        </button>
                      )}
                    </div>

                    {/* Invite Member Section (Only for Owners/Admins) */}
                    {(selectedWorkspace?.role === 'owner' || selectedWorkspace?.role === 'admin') && (
                      <form onSubmit={handleInviteMember} className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Invite Member to Workspace</span>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="email"
                            placeholder="colleague@email.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-zinc-900 text-sm"
                            required
                          />
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as any)}
                            className="p-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="viewer">Viewer (Read Only)</option>
                            <option value="editor">Editor (Modify QR)</option>
                            <option value="admin">Admin (Manage Members)</option>
                          </select>
                          <button
                            type="submit"
                            disabled={inviteLoading || !inviteEmail.trim()}
                            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                          >
                            {inviteLoading ? 'Inviting...' : 'Invite'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Workspace Members list */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">Workspace Members</span>
                      
                      {membersLoading ? (
                        <div className="py-6 flex justify-center items-center text-zinc-400">
                          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                          <span className="text-sm">Loading members list...</span>
                        </div>
                      ) : (
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
                          {workspaceMembers.map((member) => (
                            <div key={member.userId} className="p-4 bg-white dark:bg-zinc-900/50 flex justify-between items-center text-sm">
                              <div>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{member.name} {member.userId === user?._id && '(You)'}</span>
                                <span className="block text-xs text-zinc-400 dark:text-zinc-500">{member.email}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded capitalise font-medium">
                                  {member.role}
                                </span>
                                
                                {/* Can remove? Only owners/admins, cannot remove owner, and cannot remove oneself (leaving is handled separately) */}
                                {(selectedWorkspace?.role === 'owner' || selectedWorkspace?.role === 'admin') && 
                                 member.role !== 'owner' && 
                                 member.userId !== user?._id && (
                                  <button
                                    onClick={() => handleRemoveMember(member.userId)}
                                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                                    title="Remove member"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACTIVE SESSIONS TAB */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Active Devices & Sessions</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Monitor and revoke currently active sessions logged into your account</p>
                  </div>
                  {sessions.length > 1 && (
                    <button
                      onClick={handleRevokeOthers}
                      className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-xs font-semibold rounded-lg text-red-600 dark:text-red-400 transition-colors border border-zinc-200 dark:border-zinc-700"
                    >
                      Log Out Other Devices
                    </button>
                  )}
                </div>

                {sessionsLoading ? (
                  <div className="py-12 flex justify-center items-center text-zinc-400">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2.5" />
                    <span className="text-sm">Fetching devices log...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((sess) => (
                      <div key={sess._id} className={`p-4 border rounded-xl flex justify-between items-center transition-colors ${
                        sess.isCurrent 
                          ? 'border-orange-200 dark:border-orange-950 bg-orange-50/10 dark:bg-orange-950/5' 
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50'
                      }`}>
                        <div className="flex items-center space-x-3.5">
                          <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl">
                            <Laptop className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                                {sess.browser} on {sess.os}
                              </span>
                              {sess.isCurrent && (
                                <span className="text-[10px] bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <span className="block text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                              IP: {sess.ip} • Last active: {sess.isCurrent ? 'Active now' : new Date(sess.lastActive).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {!sess.isCurrent && (
                          <button
                            onClick={() => handleRevokeSession(sess._id)}
                            className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-950"
                          >
                            Log Out
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DEVELOPER API KEYS TAB */}
            {activeTab === 'api-keys' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Developer API Keys</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Generate personal API keys to integrate QR code generation programmatically</p>
                </div>

                {/* Create Key Form */}
                <form onSubmit={handleCreateApiKey} className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="Enter key name (e.g. Server Production)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-zinc-900 text-sm"
                    required
                  />
                  <button
                    type="submit"
                    disabled={newKeyLoading || !newKeyName.trim()}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {newKeyLoading ? 'Generating...' : 'Generate Key'}
                  </button>
                </form>

                {/* Generated Key Modal display box */}
                {generatedKey && (
                  <div className="p-4.5 bg-green-50/80 dark:bg-green-950/20 border border-green-250 dark:border-green-900 rounded-xl animate-fadeIn space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider block">Key Generated Successfully</span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">This key will only be shown ONCE! Save it safely.</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-white dark:bg-zinc-950 border border-green-200 dark:border-green-900/50 p-3 rounded-lg font-mono text-sm break-all text-zinc-950 dark:text-zinc-50">
                      <span className="flex-1">{generatedKey}</span>
                      <button
                        onClick={copyToClipboard}
                        className="p-1.5 text-zinc-400 hover:text-green-600 dark:hover:text-green-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-colors"
                        title="Copy key"
                      >
                        {copiedKey ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* API Key list */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">Active API Keys</span>
                  
                  {keysLoading ? (
                    <div className="py-8 flex justify-center items-center text-zinc-400">
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                      <span className="text-sm">Fetching credentials...</span>
                    </div>
                  ) : apiKeys.length === 0 ? (
                    <div className="p-8 text-center text-sm text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      No active API keys found. Generate one using the form above.
                    </div>
                  ) : (
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
                      {apiKeys.map((key) => (
                        <div key={key._id} className="p-4 bg-white dark:bg-zinc-900/50 flex justify-between items-center text-sm">
                          <div>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{key.name}</span>
                            <span className="block font-mono text-xs text-zinc-400 dark:text-zinc-500 mt-1">{key.prefix}</span>
                            <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                              Created: {new Date(key.createdAt).toLocaleDateString()} • Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRevokeApiKey(key._id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                            title="Revoke key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}