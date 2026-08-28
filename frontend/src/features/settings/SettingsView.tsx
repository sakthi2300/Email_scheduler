import { useAppSelector } from "../../app/store";
import { Loader } from "../../components/Loader";

/**
 * SettingsView — Displays user account information and application configuration status.
 */
export function SettingsView() {
  const user = useAppSelector((state) => state.auth.user);

  if (!user) {
    return (
      <div className="py-20">
        <Loader size="lg" label="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">
          Management
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
          Settings
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Review your account profile settings and active session keys.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings Card */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">User Profile</h3>
          
          <div className="flex items-center gap-4 py-2">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-16 h-16 rounded-full ring-2 ring-slate-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-sm">
                {user.name[0]}
              </div>
            )}
            <div>
              <p className="text-base font-bold text-slate-900">{user.name}</p>
              <p className="text-sm text-slate-400 mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account ID</p>
              <p className="text-xs font-mono bg-slate-50 border border-slate-100 p-2 rounded-lg text-slate-600 mt-1 select-all">
                {user.userId}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Authentication Type</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {user.avatarUrl ? "Linked Google OAuth Account" : "Traditional Email/Password Credentials"}
              </p>
            </div>
          </div>
        </div>

        {/* System Settings Card */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">System Specifications</h3>
          
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
              <span className="text-slate-500 font-medium">MySQL Database Connection</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Connected</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
              <span className="text-slate-500 font-medium">Redis Queue Manager</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Active</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
              <span className="text-slate-500 font-medium">Elasticsearch Search Server</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Ready</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">SMTP Server Host</span>
              <span className="font-mono text-xs text-slate-600">smtp.ethereal.email</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
