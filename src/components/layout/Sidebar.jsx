import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Home, Trophy, Shield, Database, ArrowLeftRight, Calendar, 
  DollarSign, Megaphone, Inbox, User, Settings, LogOut, X, MessageCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Início', icon: Home, path: '/' },
  { label: 'Caixa de Entrada', icon: Inbox, path: '/inbox', badge: true },
  { label: 'Competições', icon: Trophy, path: '/competicoes' },
  { label: 'Times', icon: Shield, path: '/times' },
  { label: 'Transferências', icon: ArrowLeftRight, path: '/transferencias' },
  { label: 'Agenda', icon: Calendar, path: '/agenda' },
  { label: 'Finanças', icon: DollarSign, path: '/financas' },
  { label: 'Patrocinadores', icon: Megaphone, path: '/patrocinadores' },
  { label: 'Discord', icon: null, path: null, external: 'https://discord.gg/eS3tJnVdc6' },
];

const bottomItems = [
  { label: 'Meu Perfil', icon: User, path: '/perfil' },
];

export default function Sidebar({ open, onClose, user }) {
  const location = useLocation();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ destinatario_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter(n => !n.lida).length;

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border
        flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-sm tracking-wide text-foreground">HUB Modo Carreira</span>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            if (item.external) {
              return (
                <a
                  key={item.external}
                  href={item.external}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                  <span>{item.label}</span>
                  <span className="ml-auto text-[9px] text-muted-foreground">↗</span>
                </a>
              );
            }
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${active 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                `}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                {item.badge && unreadCount > 0 && (
                  <span className="ml-auto bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-3 space-y-1">
          {bottomItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${active 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                `}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {user?.role === 'admin' && (
            <>
              <Link
                to="/admin"
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${location.pathname === '/admin' ? 'bg-primary/10 text-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
              >
                <Settings className="w-4 h-4" />
                <span>Admin</span>
              </Link>
              <Link
                to="/database"
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${location.pathname === '/database' ? 'bg-primary/10 text-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
              >
                <Database className="w-4 h-4" />
                <span>Database</span>
              </Link>
            </>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200 w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
          
          {user && (
            <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-lg bg-secondary/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user.full_name || 'Usuário'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}