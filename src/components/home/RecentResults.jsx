import React from 'react';
import { Trophy, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import PlayerAvatar from '../ui/PlayerAvatar';

export default function RecentResults({ matches = [] }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          Últimos Resultados
        </h3>
        <Link to="/competicoes" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          Ver todos <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {matches.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Nenhum resultado registrado</p>
      ) : (
        <div className="space-y-3">
          {matches.slice(0, 4).map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <PlayerAvatar foto_url={m.home_team_escudo} nome={m.home_team_nome} size="sm" />
                  <span className="text-xs font-medium truncate">{m.home_team_nome}</span>
                </div>
                <div className="px-3 py-1 rounded-md bg-background text-sm font-bold text-foreground min-w-[60px] text-center">
                  {m.gols_home} - {m.gols_away}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="text-xs font-medium truncate text-right">{m.away_team_nome}</span>
                  <PlayerAvatar foto_url={m.away_team_escudo} nome={m.away_team_nome} size="sm" />
                </div>
              </div>
              <span className="ml-3 text-[10px] text-muted-foreground flex-shrink-0">R{m.rodada}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}