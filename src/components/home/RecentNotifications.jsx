import React from 'react';
import { Bell, ChevronRight, ArrowLeftRight, Calendar, AlertTriangle, Megaphone, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const iconMap = {
  transferencia: ArrowLeftRight,
  contraproposta: ArrowLeftRight,
  jogo: Calendar,
  punicao: AlertTriangle,
  patrocinador: Megaphone,
  alerta_financeiro: DollarSign,
  sistema: Bell,
};

const colorMap = {
  transferencia: 'text-primary',
  contraproposta: 'text-accent',
  jogo: 'text-chart-3',
  punicao: 'text-destructive',
  patrocinador: 'text-accent',
  alerta_financeiro: 'text-accent',
  sistema: 'text-muted-foreground',
};

export default function RecentNotifications({ notifications = [] }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-chart-3" />
          Notificações Recentes
        </h3>
        <Link to="/inbox" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          Ver Caixa de Entrada <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {notifications.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Nenhuma notificação</p>
      ) : (
        <div className="space-y-2">
          {notifications.slice(0, 5).map((n) => {
            const Icon = iconMap[n.tipo] || Bell;
            const color = colorMap[n.tipo] || 'text-muted-foreground';
            return (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${n.lida ? 'bg-secondary/20' : 'bg-secondary/50'}`}>
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${n.lida ? 'text-muted-foreground' : 'text-foreground'}`}>{n.titulo}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{n.mensagem}</p>
                </div>
                {!n.lida && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}