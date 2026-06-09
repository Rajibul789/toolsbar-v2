import type { Metadata } from "next";
import { Settings, Key, Bell, Shield } from "lucide-react";

export const metadata: Metadata = { title: "Admin Settings" };

export default function AdminSettingsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">SETTINGS</h1>
        <p className="text-xs font-mono text-text-muted">Admin account, security, and system preferences</p>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Change password */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Key className="w-4 h-4 text-neon-cyan" />
            <h2 className="font-display text-sm font-bold text-white tracking-widest">CHANGE PASSWORD</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Current Password</label>
              <input type="password" placeholder="••••••••••" className="input-cyber w-full" autoComplete="current-password" />
            </div>
            <div>
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">New Password</label>
              <input type="password" placeholder="••••••••••" className="input-cyber w-full" autoComplete="new-password" />
            </div>
            <div>
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Confirm New Password</label>
              <input type="password" placeholder="••••••••••" className="input-cyber w-full" autoComplete="new-password" />
            </div>
            <button className="btn-neon text-sm font-mono px-5 py-2.5">Update Password</button>
          </div>
        </div>

        {/* Session management */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Shield className="w-4 h-4 text-neon-green" />
            <h2 className="font-display text-sm font-bold text-white tracking-widest">SECURITY</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-neon-cyan/8">
              <div>
                <p className="text-xs font-mono text-text-primary">Session Duration</p>
                <p className="text-[11px] font-mono text-text-muted">How long admin sessions stay active</p>
              </div>
              <select className="input-cyber text-xs px-3 py-2 rounded-lg">
                <option value="7d">7 days</option>
                <option value="1d">24 hours</option>
                <option value="12h">12 hours</option>
              </select>
            </div>
            <form action="/api/auth/admin-logout" method="POST">
              <button type="submit" className="text-xs font-mono text-neon-red hover:underline">
                Sign out all sessions
              </button>
            </form>
          </div>
        </div>

        {/* Maintenance mode */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Settings className="w-4 h-4 text-neon-orange" />
            <h2 className="font-display text-sm font-bold text-white tracking-widest">SITE STATUS</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-text-primary">Maintenance Mode</p>
              <p className="text-[11px] font-mono text-text-muted">Show a maintenance page to all visitors</p>
            </div>
            <div
              className="w-12 h-6 rounded-full relative cursor-pointer transition-colors"
              style={{ background: "rgba(71,85,105,0.3)", border: "1px solid rgba(71,85,105,0.4)" }}
            >
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-text-muted transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
