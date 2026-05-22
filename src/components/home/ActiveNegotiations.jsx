import React from 'react';
import { ArrowLeftRight, ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import PlayerAvatar from '../ui/PlayerAvatar';
import { Badge } from '@/components/ui/badge';

const statusColors = {
  pendente: 'bg-accent/10 text-accent border-accent/20',
  aceito: 'bg-primary/10 text-primary border-primary/20',
  recusado: 'bg-destructive/10 text-destructive border-destructive/20',
  contraproposta: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  expirado: 'bg-muted text-muted-foreground border-border',
};

export default function ActiveNegotiations({ negotiations = [] }) {
  const formatMoney = (v) => {
    if (!v) return '—';
    if (v >= 1000000) return `€${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `€${(v / 1000).toFixed(0)}K`;
    return `€${v}`;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-primary" />
          Negociações Ativas
        </h3>
        <Link to="/transferencias" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          Ver todas <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {negotiations.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Nenhuma negociação ativa</p>
      ) : (
        <div className="space-y-3">
          {negotiations.slice(0, 4).map((n) => (
            <div key={n.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40">
              <PlayerAvatar foto_url={n.player_foto} nome={n.player_nome} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{n.player_nome}</p>
                <p className="text-[10px] text-muted-foreground">{n.comprador_team_nome} ← {n.vendedor_team_nome}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-accent">{formatMoney(n.valor_proposta)}</p>
                <Badge variant="outline" className={`text-[9px] mt-0.5 ${statusColors[n.status] || ''}`}>
                  {n.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
