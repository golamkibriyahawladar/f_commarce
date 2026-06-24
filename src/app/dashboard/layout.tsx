'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  LogOut, 
  ShieldAlert, 
  CheckCircle,
  Menu,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Cpu,
  User as UserIcon,
  Bell,
  FileText,
  Plug,
  BookOpen
} from 'lucide-react';


interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active: boolean;
}

const SidebarItem = ({ href, icon, label, collapsed, active }: SidebarItemProps) => (
  <Link 
    href={href} 
    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
      active 
        ? 'bg-emerald-50 text-emerald-600' 
        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
    }`}
  >
    <span className="shrink-0">{icon}</span>
    {!collapsed && <span className="animate-in fade-in duration-200">{label}</span>}
  </Link>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, initialize, signOut } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiAutopilot, setAiAutopilot] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-zinc-600 font-medium text-sm">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const menuItems = [
    { href: '/dashboard', icon: <TrendingUp className="w-5 h-5" />, label: 'Overview' },
    { href: '/dashboard/inbox', icon: <MessageSquare className="w-5 h-5" />, label: 'Omnichannel Inbox' },
    { href: '/dashboard/leads', icon: <FileText className="w-5 h-5" />, label: 'Meta Leads' },
    { href: '/dashboard/crm', icon: <Users className="w-5 h-5" />, label: 'CRM & Delivery' },
    { href: '/dashboard/integrations', icon: <Plug className="w-5 h-5" />, label: 'Integrations' },
    { href: '/dashboard/docs', icon: <BookOpen className="w-5 h-5" />, label: 'Documentation' },
    { href: '/dashboard/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' }
  ];


  const sidebarContent = (isMobile: boolean) => (
    <div className="flex flex-col justify-between h-full bg-white">
      <div>
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200">
          {(!collapsed || isMobile) ? (
            <Image src="/logo.svg" alt="Autozy" width={120} height={40} className="h-8 w-auto" />
          ) : (
            <Image src="/icon.svg" alt="Autozy" width={32} height={32} className="h-8 w-8 mx-auto" />
          )}
          
          {!isMobile && (
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="text-zinc-500 hover:text-zinc-900 p-1 rounded-md hover:bg-zinc-50 transition-colors"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              collapsed={isMobile ? false : collapsed}
              active={pathname === item.href}
            />
          ))}
        </nav>
      </div>

      {/* Footer/Profile Section */}
      <div className="p-3 border-t border-zinc-200">
        <div className="flex items-center gap-3 px-1 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1 animate-in fade-in duration-200">
              <p className="text-xs font-semibold text-zinc-900 truncate">{profile?.full_name || 'User Profile'}</p>
              <p className="text-[10px] text-zinc-500 capitalize truncate">{profile?.role || 'Agent'}</p>
            </div>
          )}
        </div>
        <button 
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {(!collapsed || isMobile) && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-zinc-50 overflow-hidden relative">
      {/* 1. Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 2. Mobile Sidebar Slide-out Drawer */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-zinc-200 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent(true)}
      </aside>

      {/* 3. Desktop/Laptop Sidebar (Persistent but Collapsible) */}
      <aside 
        className={`hidden lg:flex flex-col border-r border-zinc-200 transition-all duration-300 ease-in-out shrink-0 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        {/* Top Header Panel */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Open Button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="text-zinc-600 hover:text-zinc-900 p-1.5 rounded-lg hover:bg-zinc-100 lg:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm font-semibold text-zinc-500 truncate">Workspace /</span>
              <span className="text-xs sm:text-sm font-bold text-zinc-900 capitalize truncate max-w-[100px] sm:max-w-none">
                {pathname === '/dashboard' ? 'Overview' : pathname.split('/').pop()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* AI Autopilot Switch */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className={`text-[10px] sm:text-xs font-bold ${aiAutopilot ? 'text-orange-500' : 'text-zinc-400'}`}>
                {aiAutopilot ? 'AI Active' : 'AI Off'}
              </span>
              <button 
                onClick={() => setAiAutopilot(!aiAutopilot)}
                role="switch"
                aria-checked={aiAutopilot}
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  aiAutopilot ? 'bg-orange-500' : 'bg-zinc-200'
                }`}
              >
                <span 
                  className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    aiAutopilot ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="h-6 w-px bg-zinc-200" />

            {/* Notification */}
            <button className="text-zinc-500 hover:text-zinc-900 relative p-1 rounded-full hover:bg-zinc-50">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Content Box */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-50">
          {children}
        </main>
      </div>
    </div>
  );
}

