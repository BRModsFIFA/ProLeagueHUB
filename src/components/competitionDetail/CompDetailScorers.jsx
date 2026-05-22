import React from 'react';
import PlayerAvatar from '../ui/PlayerAvatar';
import { Crosshair } from 'lucide-react';

export default function CompDetailScorers({ leagueMatches, matchEvents, teams }) {
  const matchIds = new Set(leagueMatches.map(m => m.id));
  const leagueEvents = matchEvents.filter(e => matchIds.has(e.match_id));

  // Agregar por jogador
  const playerMap = {};
  leagueEvents.forEach(e => {
    if (!playerMap[e.player_id]) {
      playerMap[e.player_id] = {
        player_id: e.player_id,
        player_nome: e.player_nome,
        team_id: e.team_id,
        team_nome: e.team_nome,
        gols: 0,
        assistencias: 0,
        jogos: new Set(),
      };
    }
    if (e.tipo === 'gol') playerMap[e.player_id].gols++;
    if (e.tipo === 'assistencia') playerMap[e.player_id].assistencias++;
    playerMap[e.player_id].jogos.add(e.match_id);
  });

  const scorers = Object.values(playerMap)
    .map(p => ({
      ...p,
      jogos: p.jogos.size,
      media: p.jogos.size > 0 ? (p.gols / p.jogos.size).toFixed(2) : '0.00',
    }))
    .filter(p => p.gols > 0)
    .sort((a, b) => b.gols - a.gols || b.assistencias - a.assistencias);

  if (scorers.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <Crosshair className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum gol registrado ainda</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-3 py-2.5 text-left w-8">#</th>
            <th className="px-3 py-2.5 text-left">Jogador</th>
            <th className="px-3 py-2.5 text-left hidden sm:table-cell">Time</th>
            <th className="px-3 py-2.5 text-center font-bold">Gols</th>
            <th className="px-3 py-2.5 text-center hidden sm:table-cell">Assists</th>
            <th className="px-3 py-2.5 text-center hidden md:table-cell">Jogos</th>
            <th className="px-3 py-2.5 text-center hidden md:table-cell">Média</th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((s, idx) => (
            <tr key={s.player_id} className="border-b border-border/40 hover:bg-secondary/30">
              <td className="px-3 py-2 text-center text-muted-foreground font-mono">{idx + 1}</td>
              <td className="px-3 py-2 font-medium">{s.player_nome}</td>
              <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{s.team_nome}</td>
              <td className="px-3 py-2 text-center font-bold text-primary">{s.gols}</td>
              <td className="px-3 py-2 text-center hidden sm:table-cell">{s.assistencias}</td>
              <td className="px-3 py-2 text-center hidden md:table-cell">{s.jogos}</td>
              <td className="px-3 py-2 text-center hidden md:table-cell">{s.media}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}