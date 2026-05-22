import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Pencil, Trash2, Trash, AlertTriangle, RefreshCw, PlusCircle, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import MatchGeneratorModal from './MatchGeneratorModal';

const STATUS_LABELS = {
  pendente: 'Pendente', agendado: 'Agendado', em_andamento: 'Ao vivo',
  finalizado: 'Finalizado', aprovado: 'Aprovado', wo: 'W.O.', auditoria: 'Auditoria', cancelado: 'Cancelado',
};
const STATUS_COLORS = {
  pendente: 'text-muted-foreground',
  agendado: 'bg-accent/10 text-accent',
  em_andamento: 'bg-green-500/10 text-green-400',
  finalizado: 'bg-chart-3/10 text-chart-3',
  aprovado: 'bg-primary/10 text-primary',
  wo: 'bg-destructive/10 text-destructive',
  auditoria: 'bg-yellow-500/10 text-yellow-400',
  cancelado: 'bg-secondary text-muted-foreground',
};

const emptyEdit = {
  rodada: 1, home_team_nome: '', away_team_nome: '', gols_home: 0, gols_away: 0,
  data_hora: '', status: 'pendente',
};

export default function CompDetailMatches({ leagueMatches, league, leagueTeams = [], user }) {
  const queryClient = useQueryClient();
  const rodadas = [...new Set(leagueMatches.map(m => m.rodada))].sort((a, b) => a - b);
  const [rodadaIdx, setRodadaIdx] = useState(0); // index into rodadas array
  const [editMatch, setEditMatch] = useState(null);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [confirmModal, setConfirmModal] = useState(null);
  const [generatorMode, setGeneratorMode] = useState(null);
  const [eventForm, setEventForm] = useState({ player_nome: '', player_id: '', team_id: '', team_nome: '', tipo: 'gol', minuto: '' });
  const [playerSearch, setPlayerSearch] = useState('');

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.PlayersDatabase.list('nome', 2000),
  });

  const { data: matchEvents = [] } = useQuery({
    queryKey: ['matchEvents'],
    queryFn: () => base44.entities.MatchEvent.list(),
  });

  const currentRodada = rodadas[rodadaIdx];

  const filtered = currentRodada !== undefined
    ? leagueMatches.filter(m => m.rodada === currentRodada)
    : leagueMatches;

  const grouped = {};
  filtered.forEach(m => {
    if (!grouped[m.rodada]) grouped[m.rodada] = [];
    grouped[m.rodada].push(m);
  });

  const addEvent = useMutation({
    mutationFn: (evt) => base44.entities.MatchEvent.create(evt),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['matchEvents'] }); setEventForm({ player_nome: '', player_id: '', team_id: '', team_nome: '', tipo: 'gol', minuto: '' }); setPlayerSearch(''); },
  });

  const deleteEvent = useMutation({
    mutationFn: (id) => base44.entities.MatchEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matchEvents'] }),
  });

  const updateMatch = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Match.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['matches'] }); },
  });

  const deleteMatch = useMutation({
    mutationFn: (id) => base44.entities.Match.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matches'] }),
  });

  const openEdit = (m) => {
    setEditForm({
      rodada: m.rodada || 1,
      home_team_id: m.home_team_id || '',
      home_team_nome: m.home_team_nome || '',
      away_team_id: m.away_team_id || '',
      away_team_nome: m.away_team_nome || '',
      gols_home: m.gols_home ?? 0,
      gols_away: m.gols_away ?? 0,
      data_hora: m.data_hora || '',
      status: m.status || 'pendente',
    });
    setEventForm({ player_nome: '', player_id: '', team_id: '', team_nome: '', tipo: 'gol', minuto: '' });
    setPlayerSearch('');
    setEditMatch(m);
  };

  const handleSaveMatch = () => {
    updateMatch.mutate({ id: editMatch.id, data: editForm });
  };

  // Player autocomplete for events
  const matchHomeTeamId = editMatch?.home_team_id;
  const matchAwayTeamId = editMatch?.away_team_id;
  const priorityPlayers = allPlayers.filter(p => p.team_id === matchHomeTeamId || p.team_id === matchAwayTeamId);
  const otherPlayers = allPlayers.filter(p => p.team_id !== matchHomeTeamId && p.team_id !== matchAwayTeamId);
  const searchedPlayers = playerSearch.length >= 2
    ? [...priorityPlayers, ...otherPlayers].filter(p =>
        (p.nome_comum || p.nome || '').toLowerCase().includes(playerSearch.toLowerCase()) ||
        (p.nome || '').toLowerCase().includes(playerSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleAddEvent = () => {
    if (!editMatch || !eventForm.player_nome) return;
    addEvent.mutate({
      match_id: editMatch.id,
      tipo: eventForm.tipo,
      player_id: eventForm.player_id || '',
      player_nome: eventForm.player_nome,
      team_id: eventForm.team_id || '',
      team_nome: eventForm.team_nome || '',
      minuto: parseInt(eventForm.minuto) || 0,
    });
  };

  const handleDeleteAll = async () => {
    for (const m of leagueMatches) await base44.entities.Match.delete(m.id);
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    setConfirmModal(null);
  };

  const handleDeleteRound = async (rodada) => {
    const toDelete = leagueMatches.filter(m => m.rodada === parseInt(rodada));
    for (const m of toDelete) await base44.entities.Match.delete(m.id);
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    setConfirmModal(null);
  };

  const handleDeleteInvalid = async () => {
    const approvedIds = new Set(leagueTeams.map(t => t.id));
    const invalid = leagueMatches.filter(m => !approvedIds.has(m.home_team_id) || !approvedIds.has(m.away_team_id));
    for (const m of invalid) await base44.entities.Match.delete(m.id);
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    setConfirmModal(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-4">
      {/* Admin actions */}
      {isAdmin && (
        <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Ações Administrativas</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-7 text-[10px] text-primary border-primary/30 hover:bg-primary/10"
              onClick={() => setGeneratorMode('rodada')}>
              <PlusCircle className="w-3 h-3 mr-1" /> Gerar Rodada
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] text-primary border-primary/30 hover:bg-primary/10"
              onClick={() => setGeneratorMode('completo')}>
              <RefreshCw className="w-3 h-3 mr-1" /> Gerar Calendário Completo
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setConfirmModal({ type: 'all', label: 'Apagar TODAS as partidas desta competição?', action: handleDeleteAll })}>
              <Trash className="w-3 h-3 mr-1" /> Apagar Todas
            </Button>
            {currentRodada !== undefined && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setConfirmModal({ type: 'round', label: `Apagar todas as partidas da Rodada ${currentRodada}?`, action: () => handleDeleteRound(currentRodada) })}>
                <Trash className="w-3 h-3 mr-1" /> Apagar Rodada {currentRodada}
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-[10px] text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10"
              onClick={() => setConfirmModal({ type: 'invalid', label: 'Apagar partidas com times não cadastrados nesta liga?', action: handleDeleteInvalid })}>
              <AlertTriangle className="w-3 h-3 mr-1" /> Apagar Inválidas
            </Button>
          </div>
        </div>
      )}

      {/* Premium Round Selector */}
      {rodadas.length > 0 && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={rodadaIdx <= 0} onClick={() => setRodadaIdx(i => Math.max(0, i - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Select value={String(currentRodada)} onValueChange={v => setRodadaIdx(rodadas.indexOf(parseInt(v)))}>
            <SelectTrigger className="w-36 h-8 bg-secondary border-0 text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rodadas.map(r => (
                <SelectItem key={r} value={String(r)}>Rodada {r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={rodadaIdx >= rodadas.length - 1} onClick={() => setRodadaIdx(i => Math.min(rodadas.length - 1, i + 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground">{rodadaIdx + 1} / {rodadas.length} rodadas</span>
        </div>
      )}

      {Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map(rodada => (
        <div key={rodada}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Rodada {rodada}
          </h4>
          <div className="space-y-2">
            {grouped[rodada].map(m => {
              const finished = ['finalizado', 'aprovado'].includes(m.status);
              return (
                <div key={m.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <span className="font-medium text-xs flex-1 truncate text-right">{m.home_team_nome}</span>
                  <div className="text-center flex-shrink-0 min-w-[70px]">
                    {finished ? (
                      <span className="text-base font-bold">{m.gols_home} – {m.gols_away}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">vs</span>
                    )}
                    <p className={`text-[9px] mt-0.5 ${STATUS_COLORS[m.status] || ''}`}>{STATUS_LABELS[m.status] || m.status}</p>
                  </div>
                  <span className="font-medium text-xs flex-1 truncate">{m.away_team_nome}</span>
                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(m)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                        onClick={() => setConfirmModal({ type: 'single', label: `Excluir a partida ${m.home_team_nome} x ${m.away_team_nome}?`, action: () => { deleteMatch.mutate(m.id); setConfirmModal(null); } })}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {leagueMatches.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma partida cadastrada</p>
          {isAdmin && <p className="text-xs text-muted-foreground mt-1">Use "Gerar Calendário Completo" para criar todas as partidas</p>}
        </div>
      )}

      {/* Edit Match Dialog */}
      <Dialog open={!!editMatch} onOpenChange={() => setEditMatch(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Partida</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Basic match fields */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Rodada</Label><Input type="number" min={1} value={editForm.rodada} onChange={e => setEditForm(p => ({...p, rodada: parseInt(e.target.value)||1}))} /></div>
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(p => ({...p, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mandante</Label>
                <Select value={editForm.home_team_id || 'none'} onValueChange={v => {
                  const t = leagueTeams.find(t => t.id === v);
                  setEditForm(p => ({...p, home_team_id: v === 'none' ? '' : v, home_team_nome: t?.nome || p.home_team_nome}));
                }}>
                  <SelectTrigger><SelectValue placeholder={editForm.home_team_nome || 'Selecionar'} /></SelectTrigger>
                  <SelectContent>
                    {leagueTeams.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visitante</Label>
                <Select value={editForm.away_team_id || 'none'} onValueChange={v => {
                  const t = leagueTeams.find(t => t.id === v);
                  setEditForm(p => ({...p, away_team_id: v === 'none' ? '' : v, away_team_nome: t?.nome || p.away_team_nome}));
                }}>
                  <SelectTrigger><SelectValue placeholder={editForm.away_team_nome || 'Selecionar'} /></SelectTrigger>
                  <SelectContent>
                    {leagueTeams.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Gols {editForm.home_team_nome || 'Mandante'}</Label><Input type="number" min={0} value={editForm.gols_home} onChange={e => setEditForm(p => ({...p, gols_home: parseInt(e.target.value)||0}))} /></div>
              <div><Label>Gols {editForm.away_team_nome || 'Visitante'}</Label><Input type="number" min={0} value={editForm.gols_away} onChange={e => setEditForm(p => ({...p, gols_away: parseInt(e.target.value)||0}))} /></div>
            </div>
            <div><Label>Data/Hora</Label><Input type="datetime-local" value={editForm.data_hora} onChange={e => setEditForm(p => ({...p, data_hora: e.target.value}))} /></div>
            <Button onClick={handleSaveMatch} className="w-full" disabled={updateMatch.isPending}>
              {updateMatch.isPending ? 'Salvando...' : 'Salvar Partida'}
            </Button>

            {/* Events section */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Eventos da Partida</h4>

              {/* Existing events */}
              {editMatch && (() => {
                const evts = matchEvents.filter(e => e.match_id === editMatch.id);
                if (evts.length === 0) return <p className="text-xs text-muted-foreground">Nenhum evento registrado.</p>;
                return (
                  <div className="space-y-1.5">
                    {evts.map(e => (
                      <div key={e.id} className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-1.5 text-xs">
                        <span className="font-medium">{e.player_nome}</span>
                        <span className="text-muted-foreground">{e.team_nome}</span>
                        <Badge variant="outline" className="text-[9px]">{e.tipo}</Badge>
                        <span className="text-muted-foreground">{e.minuto}'</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={() => deleteEvent.mutate(e.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Add event form */}
              <div className="bg-secondary/20 rounded-lg p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Adicionar Evento</p>
                <div className="relative">
                  <Input
                    placeholder="Buscar jogador (mín. 2 letras)..."
                    value={playerSearch}
                    onChange={e => setPlayerSearch(e.target.value)}
                    className="bg-secondary border-0 text-xs h-8"
                  />
                  {searchedPlayers.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 bg-popover border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {searchedPlayers.map(p => (
                        <button key={p.id} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/60 text-left text-xs"
                          onClick={() => {
                            setEventForm(f => ({ ...f, player_id: p.id, player_nome: p.nome_comum || p.nome, team_id: p.team_id, team_nome: p.team_nome }));
                            setPlayerSearch(p.nome_comum || p.nome);
                          }}>
                          <span className="font-medium">{p.nome_comum || p.nome}</span>
                          <span className="text-muted-foreground">{p.posicao}</span>
                          <span className="text-muted-foreground ml-auto">{p.team_nome}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={eventForm.tipo} onValueChange={v => setEventForm(f => ({...f, tipo: v}))}>
                    <SelectTrigger className="h-8 text-xs bg-secondary border-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gol">⚽ Gol</SelectItem>
                      <SelectItem value="assistencia">🎯 Assistência</SelectItem>
                      <SelectItem value="amarelo">🟨 Amarelo</SelectItem>
                      <SelectItem value="vermelho">🟥 Vermelho</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Minuto" type="number" min={1} max={120} value={eventForm.minuto}
                    onChange={e => setEventForm(f => ({...f, minuto: e.target.value}))}
                    className="h-8 text-xs bg-secondary border-0" />
                  <Button size="sm" className="h-8" onClick={handleAddEvent} disabled={!eventForm.player_nome}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar Ação</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{confirmModal?.label}</p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmModal(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmModal?.action}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Generator Modal */}
      {generatorMode && (
        <MatchGeneratorModal
          open={!!generatorMode}
          onClose={() => setGeneratorMode(null)}
          mode={generatorMode}
          league={league}
          leagueTeams={leagueTeams}
          leagueMatches={leagueMatches}
          onGenerated={() => queryClient.invalidateQueries({ queryKey: ['matches'] })}
        />
      )}
    </div>
  );
}
