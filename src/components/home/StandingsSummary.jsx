import React from 'react';
import { Trophy, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StandingsSummary({ standings = [], userTeamId }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          Classificação
        </h3>
        <Link to="/competicoes" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          Ver completa <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {standings.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Classificação não disponível</p>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-[24px_1fr_32px_32px_32px_40px] gap-1 text-[10px] font-medium text-muted-foreground px-2 pb-2">
            <span>#</span><span>Time</span><span className="text-center">J</span><span className="text-center">SG</span><span className="text-center">GP</span><span className="text-right">PTS</span>
          </div>
          {standings.slice(0, 5).map((s, i) => (
            <div key={s.team_id || i} className={`grid grid-cols-[24px_1fr_32px_32px_32px_40px] gap-1 items-center px-2 py-2 rounded-md text-xs ${s.team_id === userTeamId ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary/40'}`}>
              <span className="font-bold text-muted-foreground">{i + 1}</span>
              <span className="font-medium truncate">{s.nome}</span>
              <span className="text-center text-muted-foreground">{s.jogos || 0}</span>
              <span className="text-center text-muted-foreground">{s.saldo_gols || 0}</span>
              <span className="text-center text-muted-foreground">{s.gols_pro || 0}</span>
              <span className="text-right font-bold text-primary">{s.pontos || 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}