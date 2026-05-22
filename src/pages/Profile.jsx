import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { User, Shield, Mail, Phone, Camera, Save, AlertTriangle, Trophy, DollarSign, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PlayerAvatar from '../components/ui/PlayerAvatar';
import { calcTeamFinancials, formatMoney } from '../lib/teamFinancials';

function calcTeamStandings(team, matches, punishments) {
  let j = 0, v = 0, e = 0, d = 0, gp = 0, gc = 0, pts_base = 0;
  matches.filter(m => ['finalizado', 'aprovado'].includes(m.status) && (m.home_team_id === team.id || m.away_team_id === team.id)).forEach(m => {
    const isHome = m.home_team_id === team.id;
    const gf = isHome ? (m.gols_home || 0) : (m.gols_away || 0);
    const gs = isHome ? (m.gols_away || 0) : (m.gols_home || 0);
    j++; gp += gf; gc += gs;
    if (gf > gs) { v++; pts_base += 3; } else if (gf === gs) { e++; pts_base++; } else d++;
  });
  const pts_punicao = punishments.filter(p => p.team_id === team.id && p.active !== false && p.aplicada !== false)
    .reduce((sum, p) => sum + (p.points_delta || p.pontos_perdidos || 0), 0);
  const pts = Math.max(0, pts_base - pts_punicao);
  return { j, v, e, d, gp, gc, sg: gp - gc, pts, aprov: j > 0 ? Math.round(pts / (j * 3) * 100) : 0 };
}

const PUNISHMENT_CATEGORY_LABELS = {
  pontos: 'Pontos',
  financeiro: 'Financeiro',
  disciplinar: 'Disciplinar',
  administrativo: 'Administrativo',
};

const CATEGORY_LABELS = {
  liga_domestica: 'Liga Doméstica',
  copa_domestica: 'Copa Doméstica',
  internacional: 'Internacional',
};

export default function Profile() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', age: '', photo_url: '', phone: '' });

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        age: user.age || '',
        photo_url: user.photo_url || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const { data: teams = [] } = useQuery({ queryKey: ['teams'], queryFn: () => base44.entities.Team.list() });
  const { data: matches = [] } = useQuery({ queryKey: ['matches'], queryFn: () => base44.entities.Match.list('-rodada', 500) });
  const { data: punishments = [] } = useQuery({ queryKey: ['punishments'], queryFn: () => base44.entities.Punishment.list('-created_date', 200) });
  const { data: leagues = [] } = useQuery({ queryKey: ['leagues'], queryFn: () => base44.entities.League.list() });
  const { data: registrations = [] } = useQuery({ queryKey: ['registrations'], queryFn: () => base44.entities.CompetitionRegistration.list() });

  const userTeam = teams.find(t => t.player_email === user?.email);

  const { data: teamPlayers = [] } = useQuery({
    queryKey: ['players', userTeam?.id],
    queryFn: () => base44.entities.PlayersDatabase.filter({ team_id: userTeam.id }),
    enabled: !!userTeam?.id,
  });

  const financials = userTeam ? calcTeamFinancials(userTeam, teamPlayers) : null;

  const teamStats = userTeam ? calcTeamStandings(userTeam, matches, punishments) : null;
  const teamPunishments = userTeam ? punishments.filter(p => p.team_id === userTeam.id && p.active !== false && p.aplicada !== false) : [];
  const league = userTeam ? leagues.find(l => l.id === userTeam.league_id) : null;

  // Leagues the user's team participates in (approved registrations)
  const participatingLeagueIds = userTeam
    ? registrations
        .filter(r => r.team_id === userTeam.id && ['aprovado', 'pago', 'isento'].includes(r.status))
        .map(r => r.competition_id)
    : [];
  const participatingLeagues = leagues.filter(l => participatingLeagueIds.includes(l.id) || l.id === userTeam?.league_id);

  // Calcular posição na tabela
  let tablePosition = null;
  if (userTeam && league) {
    const leagueTeams = teams.filter(t => t.league_id === league.id);
    const leagueMatches = matches.filter(m => m.league_id === league.id);
    const leaguePunishments = punishments.filter(p => p.league_id === league.id || p.competition_id === league.id);
    const standings = leagueTeams.map(t => {
      const s = calcTeamStandings(t, leagueMatches, leaguePunishments);
      return { team: t, ...s };
    }).sort((a, b) => b.pts - a.pts || b.v - a.v || b.sg - a.sg || b.gp - a.gp || a.team.nome.localeCompare(b.team.nome));
    tablePosition = standings.findIndex(s => s.team.id === userTeam.id) + 1;
  }

  const saveProfile = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => { queryClient.invalidateQueries(); setEditing(false); },
  });

  const handleSave = () => {
    if (!form.full_name.trim()) return;
    saveProfile.mutate({ full_name: form.full_name, age: form.age, photo_url: form.photo_url, phone: form.phone });
  };

  const byCategory = {};
  teamPunishments.forEach(p => {
    const cat = p.category || 'disciplinar';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  });

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[800px] mx-auto">
      {/* Perfil */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="flex-shrink-0">
            {form.photo_url ? (
              <img src={form.photo_url} alt="" className="w-20 h-20 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-border">
                <span className="text-2xl font-bold text-primary">{user?.full_name?.[0]?.toUpperCase() || '?'}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{user?.full_name || 'Usuário'}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3" /> {user?.email}
            </p>
            <Badge variant="outline" className="mt-2 text-xs">{user?.role || 'user'}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancelar' : 'Editar'}
          </Button>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Seu nome" />
              {!form.full_name.trim() && <p className="text-[10px] text-destructive mt-1">Nome é obrigatório</p>}
            </div>
            <div>
              <Label>Idade</Label>
              <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Sua idade" />
            </div>
            <div>
              <Label>Foto (URL)</Label>
              <Input value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." />
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Camera className="w-3 h-3" /> Insira a URL de uma imagem.</p>
            </div>
            <div>
              <Label>Celular</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+55 (11) 99999-9999" />
            </div>
            <div className="bg-secondary/40 rounded-lg px-3 py-2 flex items-center gap-2">
              <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">E-mail (somente leitura)</p>
                <p className="text-xs font-medium">{user?.email}</p>
              </div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={!form.full_name.trim() || saveProfile.isPending}>
              <Save className="w-4 h-4 mr-1" /> {saveProfile.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {user?.age && <div className="flex items-center gap-2 text-muted-foreground"><User className="w-3 h-3" /> {user.age} anos</div>}
            {user?.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3 h-3" /> {user.phone}</div>}
          </div>
        )}
      </div>

      {/* Ligas Participando */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-accent" /> Ligas Participando</h2>
        {participatingLeagues.length === 0 ? (
          <p className="text-xs text-muted-foreground">Seu clube ainda não participa de nenhuma liga.</p>
        ) : (
          <div className="space-y-2">
            {participatingLeagues.map(l => {
              const leagueTeams = teams.filter(t => t.league_id === l.id);
              const leagueMatches = matches.filter(m => m.league_id === l.id);
              const leaguePunishments = punishments.filter(p => p.league_id === l.id || p.competition_id === l.id);
              let pos = null;
              if (userTeam && l.formato !== 'mata_mata') {
                const standings = leagueTeams.map(t => {
                  const s = calcTeamStandings(t, leagueMatches, leaguePunishments);
                  return { team: t, ...s };
                }).sort((a, b) => b.pts - a.pts || b.v - a.v || b.sg - a.sg);
                const idx = standings.findIndex(s => s.team.id === userTeam.id);
                if (idx >= 0) pos = idx + 1;
              }
              return (
                <div key={l.id} className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2.5">
                  {l.logo_url ? (
                    <img src={l.logo_url} alt="" className="w-8 h-8 rounded object-cover border border-border flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{l.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{l.temporada} · {CATEGORY_LABELS[l.categoria] || l.categoria}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant="outline" className="text-[9px]">{l.status === 'ativa' ? 'Em andamento' : l.status}</Badge>
                    {pos && <span className="text-[10px] font-bold text-primary">{pos}º lugar</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Meu Clube */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Meu Clube</h2>
        {userTeam ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <PlayerAvatar foto_url={userTeam.escudo_url} nome={userTeam.nome} size="lg" />
              <div>
                <h3 className="text-base font-bold">{userTeam.nome}</h3>
                {league && <p className="text-xs text-muted-foreground">{league.nome} · {league.temporada}</p>}
              </div>
            </div>

            {teamStats && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {tablePosition && (
                    <div className="col-span-3 bg-primary/10 border border-primary/20 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-primary">{tablePosition}º</p>
                      <p className="text-[10px] text-muted-foreground">Posição na tabela</p>
                    </div>
                  )}
                  {[
                    { label: 'Jogos', value: teamStats.j },
                    { label: 'Pontos', value: teamStats.pts },
                    { label: 'Vitórias', value: teamStats.v },
                    { label: 'Empates', value: teamStats.e },
                    { label: 'Derrotas', value: teamStats.d },
                    { label: 'Gols Pró', value: teamStats.gp },
                    { label: 'Gols Contra', value: teamStats.gc },
                    { label: 'Saldo', value: teamStats.sg > 0 ? `+${teamStats.sg}` : teamStats.sg },
                    { label: 'Aproveita.', value: `${teamStats.aprov}%` },
                  ].map(s => (
                    <div key={s.label} className="bg-secondary/40 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold">{s.value}</p>
                      <p className="text-[9px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {financials && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-secondary/40 rounded-lg p-3 text-center">
                      <DollarSign className="w-3 h-3 text-accent mx-auto mb-1" />
                      <p className="text-sm font-bold text-accent">{formatMoney(financials.orcamento)}</p>
                      <p className="text-[9px] text-muted-foreground">Orçamento</p>
                    </div>
                    <div className="bg-secondary/40 rounded-lg p-3 text-center">
                      <TrendingUp className="w-3 h-3 text-primary mx-auto mb-1" />
                      <p className="text-sm font-bold text-primary">{formatMoney(financials.valorClube)}</p>
                      <p className="text-[9px] text-muted-foreground">Valor do Clube</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum clube vinculado.</p>
          </div>
        )}
      </div>

      {/* Punições */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Punições</h2>
        {teamPunishments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma punição registrada.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{PUNISHMENT_CATEGORY_LABELS[cat] || cat}</h4>
                <div className="space-y-2">
                  {items.map(p => {
                    const comp = leagues.find(l => l.id === p.league_id || l.id === p.competition_id);
                    return (
                      <div key={p.id} className="bg-secondary/30 rounded-lg px-3 py-2 flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium">{p.descricao}</p>
                          {comp && <p className="text-[10px] text-muted-foreground">{comp.nome}</p>}
                          <p className="text-[10px] text-muted-foreground">{new Date(p.created_date).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="text-right ml-2">
                          {(p.points_delta > 0 || p.pontos_perdidos > 0) && (
                            <span className="text-[10px] text-destructive font-bold block">-{p.points_delta || p.pontos_perdidos} pts</span>
                          )}
                          {(p.financial_amount > 0 || p.valor_multa > 0) && (
                            <span className="text-[10px] text-destructive block">€{(p.financial_amount || p.valor_multa)?.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}