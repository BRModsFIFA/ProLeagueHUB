import React from 'react';
import PlayerAvatar from '../ui/PlayerAvatar';

function calcStandings(teams, matches, punishments) {
  const map = {};
  teams.forEach(t => {
    map[t.id] = {
      team: t,
      j: 0, v: 0, e: 0, d: 0,
      gp: 0, gc: 0,
      pts_base: 0,
      pts_punicao: 0,
    };
  });

  matches.filter(m => ['finalizado', 'aprovado'].includes(m.status)).forEach(m => {
    const home = map[m.home_team_id];
    const away = map[m.away_team_id];
    if (!home || !away) return;
    const gh = m.gols_home || 0;
    const ga = m.gols_away || 0;
    home.j++; away.j++;
    home.gp += gh; home.gc += ga;
    away.gp += ga; away.gc += gh;
    if (gh > ga) { home.v++; home.pts_base += 3; away.d++; }
    else if (gh < ga) { away.v++; away.pts_base += 3; home.d++; }
    else { home.e++; away.e++; home.pts_base++; away.pts_base++; }
  });

  punishments.filter(p => p.active !== false && p.aplicada !== false).forEach(p => {
    const entry = map[p.team_id];
    if (entry) entry.pts_punicao += (p.points_delta || p.pontos_perdidos || 0);
  });

  return Object.values(map).map(e => ({
    ...e,
    sg: e.gp - e.gc,
    pts: Math.max(0, e.pts_base - e.pts_punicao),
    aprov: e.j > 0 ? Math.round((e.pts_base - e.pts_punicao) / (e.j * 3) * 100) : 0,
  })).sort((a, b) =>
    b.pts - a.pts ||
    b.v - a.v ||
    b.sg - a.sg ||
    b.gp - a.gp ||
    a.team.nome.localeCompare(b.team.nome)
  );
}

export default function CompDetailTable({ league, leagueTeams, leagueMatches, leaguePunishments, leagueZones, userTeam }) {
  const standings = calcStandings(leagueTeams, leagueMatches, leaguePunishments);

  const getZone = (pos) => leagueZones.find(z => pos >= z.pos_inicio && pos <= z.pos_fim);

  return (
    <div className="space-y-5">
      {/* Tabela */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-2 py-2.5 text-center w-10 text-[10px]">POS</th>
              <th className="px-3 py-2.5 text-left min-w-[160px]">Clube</th>
              <th className="px-3 py-2.5 text-center">J</th>
              <th className="px-3 py-2.5 text-center">V</th>
              <th className="px-3 py-2.5 text-center">E</th>
              <th className="px-3 py-2.5 text-center">D</th>
              <th className="px-3 py-2.5 text-center hidden sm:table-cell">GP</th>
              <th className="px-3 py-2.5 text-center hidden sm:table-cell">GC</th>
              <th className="px-3 py-2.5 text-center">SG</th>
              <th className="px-3 py-2.5 text-center font-bold">PTS</th>
              <th className="px-3 py-2.5 text-center hidden md:table-cell">%</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, idx) => {
              const pos = idx + 1;
              const zone = getZone(pos);
              const isUser = userTeam && s.team.id === userTeam.id;
              const hasPunicao = s.pts_punicao > 0;
              return (
                <tr
                  key={s.team.id}
                  className={`border-b border-border/40 transition-colors ${isUser ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}
                >
                  <td className="px-1 py-2.5 text-center relative">
                    {zone && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-sm"
                        style={{ backgroundColor: zone.cor }}
                      />
                    )}
                    <span className="text-muted-foreground font-mono ml-1">{pos}</span>
                  </td>
                  <td className="px-3 py-2">
                   <div className="flex items-center gap-2">
                     <PlayerAvatar foto_url={s.team.escudo_url} nome={s.team.nome} size="sm" />
                     <div>
                       <span className={`font-medium text-xs ${isUser ? 'text-primary' : ''}`}>{s.team.nome}</span>
                       <div>
                         {s.team.owner_user_id || s.team.player_email || s.team.owner_email ? (
                           <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 rounded px-1">
                             {s.team.owner_name || s.team.player_email || s.team.owner_email}
                           </span>
                         ) : (
                           <span className="text-[9px] bg-destructive/10 text-destructive border border-destructive/20 rounded px-1">Sem player</span>
                         )}
                       </div>
                     </div>
                   </div>
                  </td>
                  <td className="px-3 py-2 text-center">{s.j}</td>
                  <td className="px-3 py-2 text-center text-primary font-medium">{s.v}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{s.e}</td>
                  <td className="px-3 py-2 text-center text-destructive">{s.d}</td>
                  <td className="px-3 py-2 text-center hidden sm:table-cell">{s.gp}</td>
                  <td className="px-3 py-2 text-center hidden sm:table-cell">{s.gc}</td>
                  <td className={`px-3 py-2 text-center font-medium ${s.sg > 0 ? 'text-primary' : s.sg < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {s.sg > 0 ? '+' : ''}{s.sg}
                  </td>
                  <td className="px-3 py-2 text-center font-bold">
                    {s.pts}
                    {hasPunicao && (
                      <span className="text-[9px] text-destructive block">-{s.pts_punicao}pts</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center text-muted-foreground hidden md:table-cell">{s.aprov}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {standings.length === 0 && (
          <p className="text-center text-muted-foreground text-xs py-8">Nenhum time na tabela</p>
        )}
      </div>

      {/* Legenda de zonas */}
      {leagueZones.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Legenda</h4>
          <div className="flex flex-wrap gap-3">
            {leagueZones.map(z => (
              <div key={z.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: z.cor }} />
                <span className="text-xs text-foreground">{z.nome}</span>
                <span className="text-[10px] text-muted-foreground">(pos. {z.pos_inicio}–{z.pos_fim})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Punições */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-3">Punições dos Clubes</h4>
        {leaguePunishments.filter(p => p.active !== false && p.aplicada !== false).length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma punição registrada.</p>
        ) : (
          <div className="space-y-2">
            {leaguePunishments.filter(p => p.active !== false && p.aplicada !== false).map(p => (
              <div key={p.id} className="flex items-start justify-between bg-secondary/30 rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-medium">{p.team_nome}</p>
                  <p className="text-[10px] text-muted-foreground">{p.descricao}</p>
                  <p className="text-[10px] text-muted-foreground">{p.category || p.tipo} · {new Date(p.created_date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  {(p.points_delta > 0 || p.pontos_perdidos > 0) && (
                    <span className="text-[10px] text-destructive font-bold">-{p.points_delta || p.pontos_perdidos} pts</span>
                  )}
                  {(p.financial_amount > 0 || p.valor_multa > 0) && (
                    <span className="text-[10px] text-destructive block">€{(p.financial_amount || p.valor_multa)?.toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}