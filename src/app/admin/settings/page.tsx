'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import { 
  Settings, 
  Shield, 
  Users, 
  Bell, 
  Database, 
  Mail, 
  Globe, 
  Save, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  Lock,
  Key,
  Globe2,
  Server,
  Activity
} from 'lucide-react';

type SystemStatus = {
  database: 'online' | 'offline';
  email: 'online' | 'offline';
  api: 'online' | 'offline';
  lastCheck: string;
};

type SystemConfig = {
  siteName: string;
  contactEmail: string;
  maxUsers: number;
  enableRegistration: boolean;
  requireEmailVerification: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  maintenanceMode: boolean;
};

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'online',
    email: 'online',
    api: 'online',
    lastCheck: new Date().toISOString()
  });
  const [config, setConfig] = useState<SystemConfig>({
    siteName: 'Gas Agency System',
    contactEmail: 'admin@gasagency.com',
    maxUsers: 1000,
    enableRegistration: true,
    requireEmailVerification: true,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    maintenanceMode: false
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchSystemStatus();
      fetchSystemConfig();
    }
  }, [session]);

  const fetchSystemStatus = async () => {
    try {
      // Simulate API call for system status
      setSystemStatus({
        database: 'online',
        email: 'online',
        api: 'online',
        lastCheck: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  const fetchSystemConfig = async () => {
    try {
      // Simulate API call for system configuration
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch system configuration:', error);
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      // Simulate API call to save configuration
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Show success message or handle response
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'online') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (status: string) => {
    return status === 'online' ? 'text-green-600' : 'text-red-600';
  };

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">System Settings</h1>
                <p className="text-lg text-gray-600">Configure system parameters and manage administrative settings</p>
              </div>
              <button 
                onClick={fetchSystemStatus} 
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <RefreshCw className="w-4 h-4" /> 
                Refresh Status
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { 
                title: 'Database', 
                status: systemStatus.database, 
                icon: Database,
                description: 'PostgreSQL connection'
              },
              { 
                title: 'Email Service', 
                status: systemStatus.email, 
                icon: Mail,
                description: 'SMTP configuration'
              },
              { 
                title: 'API Gateway', 
                status: systemStatus.api, 
                icon: Server,
                description: 'REST API endpoints'
              },
              { 
                title: 'System Health', 
                status: systemStatus.database === 'online' && systemStatus.email === 'online' && systemStatus.api === 'online' ? 'online' : 'offline', 
                icon: Activity,
                description: 'Overall system status'
              }
            ].map((service, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gray-50`}>
                    <service.icon className="w-6 h-6 text-gray-600" />
                  </div>
                  {getStatusIcon(service.status)}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{service.title}</h3>
                <p className={`text-sm font-medium ${getStatusColor(service.status)} mb-2`}>
                  {service.status === 'online' ? 'Operational' : 'Offline'}
                </p>
                <p className="text-xs text-gray-500">{service.description}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* General Settings */}
            <div className="xl:col-span-2 space-y-6">
              {/* Site Configuration */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Site Configuration</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Basic system information and branding</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                      <input 
                        type="text" 
                        value={config.siteName} 
                        onChange={(e) => setConfig(prev => ({ ...prev, siteName: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                      <input 
                        type="email" 
                        value={config.contactEmail} 
                        onChange={(e) => setConfig(prev => ({ ...prev, contactEmail: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Users</label>
                    <input 
                      type="number" 
                      value={config.maxUsers} 
                      onChange={(e) => setConfig(prev => ({ ...prev, maxUsers: parseInt(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Security Settings */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Authentication and security configuration</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (hours)</label>
                      <input 
                        type="number" 
                        value={config.sessionTimeout} 
                        onChange={(e) => setConfig(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                      <input 
                        type="number" 
                        value={config.maxLoginAttempts} 
                        onChange={(e) => setConfig(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Enable User Registration</label>
                        <p className="text-xs text-gray-500">Allow new users to create accounts</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={config.enableRegistration} 
                          onChange={(e) => setConfig(prev => ({ ...prev, enableRegistration: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Require Email Verification</label>
                        <p className="text-xs text-gray-500">Users must verify email before login</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={config.requireEmailVerification} 
                          onChange={(e) => setConfig(prev => ({ ...prev, requireEmailVerification: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
                        <p className="text-xs text-gray-500">Temporarily disable system access</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={config.maintenanceMode} 
                          onChange={(e) => setConfig(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button 
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors duration-200 font-medium"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* System Information */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">System Info</h3>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Status Check</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(systemStatus.lastCheck).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Environment</span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Production
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Version</span>
                    <span className="text-sm font-medium text-gray-900">1.0.0</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">User Management</p>
                        <p className="text-xs text-gray-500">Manage user accounts and permissions</p>
                      </div>
                    </div>
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <Bell className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Notifications</p>
                        <p className="text-xs text-gray-500">Configure system notifications</p>
                      </div>
                    </div>
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <Database className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Database</p>
                        <p className="text-xs text-gray-500">Database maintenance and backup</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* System Health */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">CPU Usage</span>
                      <span className="text-sm font-medium text-gray-900">23%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '23%' }}></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Memory Usage</span>
                      <span className="text-sm font-medium text-gray-900">67%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '67%' }}></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Disk Usage</span>
                      <span className="text-sm font-medium text-gray-900">45%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
