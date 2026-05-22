import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function Topbar({ onMenuClick, user }) {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card flex-shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onMenuClick}>
          <Menu className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground hidden sm:block">
          {user?.full_name || user?.email || 'HUB Modo Carreira'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 relative" asChild>
          <Link to="/inbox">
            <Bell className="w-4 h-4" />
          </Link>
        </Button>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
          {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
        </div>
      </div>
    </header>
  );
}