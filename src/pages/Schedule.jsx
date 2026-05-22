import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Calendar, Clock, Check, X, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PlayerAvatar from '../components/ui/PlayerAvatar';

function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

function isWithinWindow(dateStr, window) {
  if (!window || !window.dia_inicio || !window.dia_fim) return false;
  return dateStr >= window.dia_inicio && dateStr <= window.dia_fim;
}

export default function Schedule() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [proposeOpen, setProposeOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [propDate, setPropDate] = useState('');
  const [propTime, setPropTime] = useState('');
  const [dateError, setDateError] = useState('');
  // Admin window creation
  const [windowOpen, setWindowOpen] = useState(false);
  const [newWindow, setNewWindow] = useState({ rodada: '', dia_inicio: '', dia_fim: '' });

  const { data: matches = [] } = useQuery({
    queryKey: ['matches'],
    queryFn: () => base44.entities.Match.list('rodada', 500),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.ScheduleProposal.list('-created_date', 50),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list('-created_date', 1),
  });

  const { data: windows = [] } = useQuery({
    queryKey: ['scheduleWindows'],
    queryFn: () => base44.entities.ScheduleWindow.list('rodada', 50),
  });

  const league = leagues[0];
  const currentRodada = league?.rodada_atual || 1;
  const activeWindow = windows.find(w => w.rodada === currentRodada);

  const userTeam = teams.find(t => t.player_email === user?.email);
  const isAdmin = user?.role === 'admin';

  const userMatches = matches.filter(m =>
    (m.home_team_id === userTeam?.id || m.away_team_id === userTeam?.id) &&
    (m.status === 'pendente' || m.status === 'agendado')
  );

  const createProposal = useMutation({
    mutationFn: (data) => base44.entities.ScheduleProposal.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['proposals'] }); setProposeOpen(false); },
  });

  const updateProposal = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ScheduleProposal.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proposals'] }),
  });

  const createWindow = useMutation({
    mutationFn: (data) => base44.entities.ScheduleWindow.create({ ...data, league_id: league?.id, rodada: parseInt(data.rodada) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['scheduleWindows'] }); setWindowOpen(false); },
  });

  const updateLeagueRodada = useMutation({
    mutationFn: (rodada) => base44.entities.League.update(league?.id, { rodada_atual: rodada }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leagues'] }),
  });

  const openPropose = (match) => {
    setSelectedMatch(match);
    setPropDate('');
    setPropTime('');
    setDateError('');
    setProposeOpen(true);
  };

  const validateDate = (date) => {
    if (!date) return 'Selecione uma data.';
    if (isWeekend(date)) return 'Sábado e domingo são bloqueados para players. Escolha segunda a sexta.';
    if (!isWithinWindow(date, activeWindow)) {
      return activeWindow
        ? `Fora da janela da rodada ${currentRodada}: ${activeWindow.dia_inicio} até ${activeWindow.dia_fim}`
        : `Nenhuma janela ativa para a rodada ${currentRodada}. Aguarde o ADM liberar.`;
    }
    return '';
  };

  const handleDateChange = (date) => {
    setPropDate(date);
    setDateError(validateDate(date));
  };

  const submitProposal = () => {
    const err = validateDate(propDate);
    if (err) { setDateError(err); return; }
    if (!selectedMatch || !userTeam) return;
    const adversarioId = selectedMatch.home_team_id === userTeam.id ? selectedMatch.away_team_id : selectedMatch.home_team_id;
    createProposal.mutate({
      match_id: selectedMatch.id,
      league_id: selectedMatch.league_id,
      proponente_email: user.email,
      proponente_team_id: userTeam.id,
      adversario_team_id: adversarioId,
      data_proposta: propDate,
      hora_proposta: propTime,
    });
  };

  const matchHasWindow = (m) => {
    const matchWindow = windows.find(w => w.rodada === m.rodada);
    return !!matchWindow;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Agenda
        </h1>
        {isAdmin && (
          <Button size="sm" onClick={() => setWindowOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Liberar Janela
          </Button>
        )}
      </div>

      {/* Active Window Info */}
      {activeWindow ? (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
          <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-primary">Janela ativa — Rodada {currentRodada}</p>
            <p className="text-[10px] text-muted-foreground">{activeWindow.dia_inicio} até {activeWindow.dia_fim} · Segunda a Sexta apenas</p>
          </div>
        </div>
      ) : (
        <div className="bg-secondary/50 border border-border rounded-lg p-3 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">Nenhuma janela ativa para a rodada atual. Aguarde o ADM liberar.</p>
        </div>
      )}

      {/* Admin: all windows */}
      {isAdmin && windows.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2">Janelas Configuradas</h2>
          <div className="space-y-1">
            {windows.map(w => (
              <div key={w.id} className="flex items-center justify-between p-2 bg-card rounded-lg border border-border text-xs">
                <span className="font-medium">Rodada {w.rodada}</span>
                <span className="text-muted-foreground">{w.dia_inicio} → {w.dia_fim}</span>
                <Badge variant="outline" className="text-[9px]">{w.tipo}</Badge>
              </div>
            ))}
          </div>
          {league && (
            <div className="flex items-center gap-2 mt-3">
              <Label className="text-xs">Rodada atual:</Label>
              <Input type="number" value={currentRodada} className="w-20 h-7 text-xs bg-secondary border-0"
                onChange={e => updateLeagueRodada.mutate(parseInt(e.target.value))} />
            </div>
          )}
        </div>
      )}

      {/* My matches to schedule */}
      {userTeam && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Meus Jogos Pendentes</h2>
          <div className="space-y-2">
            {userMatches.map(m => {
              const hasWindow = matchHasWindow(m);
              return (
                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-card rounded-lg border border-border gap-2">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">R{m.rodada}</Badge>
                    <PlayerAvatar foto_url={m.home_team_escudo} nome={m.home_team_nome} size="sm" />
                    <span className="text-xs font-medium">{m.home_team_nome}</span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <span className="text-xs font-medium">{m.away_team_nome}</span>
                    <PlayerAvatar foto_url={m.away_team_escudo} nome={m.away_team_nome} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {m.data_hora && <span className="text-[10px] text-muted-foreground">{m.data_hora}</span>}
                    <Badge className={`text-[9px] ${m.status === 'agendado' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {m.status}
                    </Badge>
                    {hasWindow ? (
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => openPropose(m)}>
                        <Clock className="w-3 h-3 mr-1" /> Propor Horário
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Janela não liberada</span>
                    )}
                  </div>
                </div>
              );
            })}
            {userMatches.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nenhum jogo pendente</p>}
          </div>
        </div>
      )}

      {/* Admin: all pending matches */}
      {isAdmin && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Todos os Jogos Pendentes (Admin)</h2>
          <div className="space-y-2">
            {matches.filter(m => m.status === 'pendente' || m.status === 'agendado').slice(0, 20).map(m => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-card rounded-lg border border-border gap-2">
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">R{m.rodada}</Badge>
                  <span className="text-xs font-medium">{m.home_team_nome}</span>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <span className="text-xs font-medium">{m.away_team_nome}</span>
                </div>
                <Badge className={`text-[9px] flex-shrink-0 ${m.status === 'agendado' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  {m.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proposals */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Propostas de Horário</h2>
        <div className="space-y-2">
          {proposals.map(p => (
            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-card rounded-lg border border-border gap-2">
              <div>
                <p className="text-xs font-medium">Partida #{p.match_id?.slice(-6)}</p>
                <p className="text-[10px] text-muted-foreground">{p.data_proposta} às {p.hora_proposta} · por {p.proponente_email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[9px] ${
                  p.status === 'aceita' ? 'bg-primary/10 text-primary' :
                  p.status === 'recusada' ? 'bg-destructive/10 text-destructive' :
                  'bg-secondary text-muted-foreground'
                }`}>{p.status}</Badge>
                {p.status === 'pendente' && (isAdmin || p.adversario_team_id === userTeam?.id) && (
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-[10px]" onClick={() => updateProposal.mutate({ id: p.id, data: { status: 'aceita' } })}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateProposal.mutate({ id: p.id, data: { status: 'recusada' } })}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {proposals.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nenhuma proposta</p>}
        </div>
      </div>

      {/* Propose Dialog */}
      <Dialog open={proposeOpen} onOpenChange={setProposeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Propor Horário</DialogTitle></DialogHeader>
          {activeWindow && (
            <p className="text-[10px] text-muted-foreground bg-secondary/50 rounded p-2">
              Janela liberada: {activeWindow.dia_inicio} até {activeWindow.dia_fim} · Segunda a Sexta
            </p>
          )}
          <div className="space-y-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={propDate} onChange={e => handleDateChange(e.target.value)}
                min={activeWindow?.dia_inicio} max={activeWindow?.dia_fim} />
              {dateError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{dateError}</p>}
            </div>
            <div><Label>Hora</Label><Input type="time" value={propTime} onChange={e => setPropTime(e.target.value)} /></div>
            <Button onClick={submitProposal} className="w-full" disabled={!!dateError || !propDate || !propTime}>Enviar Proposta</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Window Creation Dialog (Admin) */}
      <Dialog open={windowOpen} onOpenChange={setWindowOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Liberar Janela de Agendamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Rodada</Label><Input type="number" value={newWindow.rodada} onChange={e => setNewWindow({...newWindow, rodada: e.target.value})} /></div>
            <div><Label>Data Início</Label><Input type="date" value={newWindow.dia_inicio} onChange={e => setNewWindow({...newWindow, dia_inicio: e.target.value})} /></div>
            <div><Label>Data Fim</Label><Input type="date" value={newWindow.dia_fim} onChange={e => setNewWindow({...newWindow, dia_fim: e.target.value})} /></div>
            <Button onClick={() => createWindow.mutate(newWindow)} className="w-full">Liberar Janela</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}