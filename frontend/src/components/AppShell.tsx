'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import {
  LayoutDashboard,
  Users,
  FileText,
  ListOrdered,
  Phone,
  Pill,
  ClipboardList,
  ShieldCheck,
  Menu,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/auth-context';
import { useIdleLogout } from '@/features/auth/useIdleLogout';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import { env } from '@/lib/env';
import { formatDate } from '@/lib/format';
import { messages } from '@/messages/en';
import type { ReactNode } from 'react';

interface NavItem {
  href: Route;
  label: string;
  icon: ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/doctor/dashboard' as Route, label: messages.nav.dashboard, icon: <LayoutDashboard className="h-4 w-4" />, roles: ['DOCTOR'] },
  { href: '/doctor/patients/search' as Route, label: messages.nav.patients, icon: <Users className="h-4 w-4" />, roles: ['DOCTOR'] },
  { href: '/doctor/prescriptions' as Route, label: messages.nav.myPrescriptions, icon: <FileText className="h-4 w-4" />, roles: ['DOCTOR'] },
  { href: '/pharmacist/dashboard' as Route, label: messages.nav.dashboard, icon: <LayoutDashboard className="h-4 w-4" />, roles: ['PHARMACIST'] },
  { href: '/pharmacist/prescriptions' as Route, label: messages.nav.prescriptions, icon: <ClipboardList className="h-4 w-4" />, roles: ['PHARMACIST'] },
  { href: '/queue' as Route, label: messages.nav.queue, icon: <ListOrdered className="h-4 w-4" />, roles: ['DOCTOR', 'PHARMACIST'] },
  { href: '/bookings/new' as Route, label: messages.nav.newBooking, icon: <Phone className="h-4 w-4" />, roles: ['DOCTOR', 'PHARMACIST'] },
  { href: '/medicines' as Route, label: messages.nav.medicines, icon: <Pill className="h-4 w-4" />, roles: ['PHARMACIST', 'ADMIN'] },
  { href: '/admin/users' as Route, label: messages.nav.users, icon: <Users className="h-4 w-4" />, roles: ['ADMIN'] },
  { href: '/admin/audit-events' as Route, label: messages.nav.auditLog, icon: <ShieldCheck className="h-4 w-4" />, roles: ['ADMIN'] },
];

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
        isActive
          ? 'bg-[#1F5F8B]/10 text-[#1F5F8B] font-semibold'
          : 'text-muted-foreground',
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

function NavItems({ onNavClick }: { onNavClick?: () => void }) {
  const { user, hasAnyRole } = useAuth();
  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => hasAnyRole(item.roles));

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {visibleItems.map((item) => (
        <NavLink key={item.href} item={item} onClick={onNavClick} />
      ))}
    </nav>
  );
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const { showWarning: showIdleWarning, secondsLeft: idleSecondsLeft, resetTimer } = useIdleLogout({
    onLogout: () => logout(),
  });

  const today = formatDate(new Date().toISOString());

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center border-b px-6">
          <span className="font-bold text-[#1F5F8B]">{env.NEXT_PUBLIC_APP_NAME}</span>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <NavItems />
        </div>
        <div className="border-t p-4">
          <div className="mb-2 text-xs text-muted-foreground">{today}</div>
          {user && (
            <div className="mb-2 text-sm font-medium truncate" title={user.fullName}>
              {user.fullName}
              <span className="ml-1 text-xs text-muted-foreground">
                ({user.roles.join(', ')})
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <Link
              href="/change-password"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <KeyRound className="h-4 w-4" />
              {messages.nav.changePassword}
            </Link>
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground text-left"
            >
              <LogOut className="h-4 w-4" />
              {messages.app.signOut}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="text-[#1F5F8B]">{env.NEXT_PUBLIC_APP_NAME}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 overflow-y-auto p-4">
            <NavItems onNavClick={() => setSidebarOpen(false)} />
            <Separator />
            <div className="flex flex-col gap-1">
              <Link
                href="/change-password"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <KeyRound className="h-4 w-4" />
                {messages.nav.changePassword}
              </Link>
              <button
                onClick={() => { logout(); setSidebarOpen(false); }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground text-left"
              >
                <LogOut className="h-4 w-4" />
                {messages.app.signOut}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-bold text-[#1F5F8B] lg:hidden">{env.NEXT_PUBLIC_APP_NAME}</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">{today}</span>
            {user && (
              <span className="hidden text-sm font-medium sm:block">{user.fullName}</span>
            )}
            <Button variant="ghost" size="sm" onClick={() => logout()} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{messages.app.signOut}</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 lg:p-6">{children}</div>
        </main>
      </div>

      {/* Idle warning dialog */}
      <ConfirmDialog
        open={showIdleWarning}
        onOpenChange={(open) => { if (!open) resetTimer(); }}
        title={messages.auth.idleWarningTitle}
        description={messages.auth.idleWarningBody(idleSecondsLeft)}
        confirmLabel={messages.auth.staySignedIn}
        onConfirm={() => resetTimer()}
      />
    </div>
  );
}
