import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Settings, Shield, Database, Trophy, AlertTriangle, ArrowLeftRight, FileText, Users, Layers } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PlayerAvatar from '../components/ui/PlayerAvatar';

export default function Admin() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('ligas');
  const [punishOpen, setPunishOpen] = useState(false);
  const [punishment, setPunishment] = useState({ team_id: '', league_id: '', tipo: 'perda_pontos', category: 'disciplinar', descricao: '', pontos_perdidos: 0, points_delta: 0, valor_multa: 0, financial_amount: 0, active: true });
  const [zoneOpen, setZoneOpen] = useState(false);
  const [zoneCompId, setZoneCompId] = useState('');
  const [zoneForm, setZoneForm] = useState({ nome: '', cor: '#22c55e', pos_inicio: 1, pos_fim: 1, descricao: '' });

  const { data: leagues = [] } = useQuery({ queryKey: ['leagues'], queryFn: () => base44.entities.League.list() });
  const { data: teams = [] } = useQuery({ queryKey: ['teams'], queryFn: () => base44.entities.Team.list() });
  const { data: matches = [] } = useQuery({ queryKey: ['matches'], queryFn: () => base44.entities.Match.list('-rodada', 50) });
  const { data: punishments = [] } = useQuery({ queryKey: ['punishments'], queryFn: () => base44.entities.Punishment.list('-created_date', 50) });
  const { data: negotiations = [] } = useQuery({ queryKey: ['negotiations'], queryFn: () => base44.entities.Negotiation.list('-created_date', 50) });
  const { data: logs = [] } = useQuery({ queryKey: ['logs'], queryFn: () => base44.entities.ActivityLog.list('-created_date', 50) });
  const { data: zones = [] } = useQuery({ queryKey: ['tableZones'], queryFn: () => base44.entities.TableZone.list() });

  const approveMatch = useMutation({
    mutationFn: (id) => base44.entities.Match.update(id, { status: 'aprovado', aprovado_por: user?.email }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matches'] }),
  });

  const createPunishment = useMutation({
    mutationFn: (data) => {
      const team = teams.find(t => t.id === data.team_id);
      return base44.entities.Punishment.create({
        ...data,
        team_nome: team?.nome,
        competition_id: data.league_id,
        points_delta: data.pontos_perdidos,
        financial_amount: data.valor_multa,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['punishments'] }); setPunishOpen(false); },
  });

  const createZone = useMutation({
    mutationFn: (data) => base44.entities.TableZone.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tableZones'] }); setZoneOpen(false); setZoneForm({ nome: '', cor: '#22c55e', pos_inicio: 1, pos_fim: 1, descricao: '' }); },
  });

  const deleteZone = useMutation({
    mutationFn: (id) => base44.entities.TableZone.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tableZones'] }),
  });

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso restrito a administradores</p>
      </div>
    );
  }

  const pendingMatches = matches.filter(m => m.status === 'finalizado');

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Painel Admin</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary flex-wrap">
          <TabsTrigger value="ligas"><Trophy className="w-3 h-3 mr-1" />Ligas</TabsTrigger>
          <TabsTrigger value="times"><Shield className="w-3 h-3 mr-1" />Times</TabsTrigger>
          <TabsTrigger value="partidas"><Database className="w-3 h-3 mr-1" />Partidas</TabsTrigger>
          <TabsTrigger value="punicoes"><AlertTriangle className="w-3 h-3 mr-1" />Punições</TabsTrigger>
          <TabsTrigger value="negs"><ArrowLeftRight className="w-3 h-3 mr-1" />Negociações</TabsTrigger>
          <TabsTrigger value="logs"><FileText className="w-3 h-3 mr-1" />Logs</TabsTrigger>
          <TabsTrigger value="zonas"><Layers className="w-3 h-3 mr-1" />Zonas</TabsTrigger>
        </TabsList>

        <TabsContent value="ligas" className="mt-4 space-y-3">
          {leagues.map(l => (
            <div key={l.id} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{l.nome}</p>
                <p className="text-xs text-muted-foreground">{l.temporada} · Rodada {l.rodada_atual} · {l.status}</p>
              </div>
              <Badge variant="outline">{l.calendario_gerado ? 'Calendário OK' : 'Sem Calendário'}</Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="times" className="mt-4 space-y-2">
          {teams.map(t => (
            <div key={t.id} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PlayerAvatar foto_url={t.escudo_url} nome={t.nome} size="sm" />
                <div>
                  <p className="text-sm font-medium">{t.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{t.player_email || '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="partidas" className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold">Aguardando Aprovação ({pendingMatches.length})</h3>
          {pendingMatches.map(m => (
            <div key={m.id} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px]">R{m.rodada}</Badge>
                <span className="text-xs">{m.home_team_nome} {m.gols_home}-{m.gols_away} {m.away_team_nome}</span>
              </div>
              <Button size="sm" className="h-7" onClick={() => approveMatch.mutate(m.id)}>Aprovar</Button>
            </div>
          ))}
          {pendingMatches.length === 0 && <p className="text-xs text-muted-foreground py-4">Nenhuma partida pendente</p>}
        </TabsContent>

        <TabsContent value="punicoes" className="mt-4 space-y-3">
          <Button size="sm" onClick={() => setPunishOpen(true)}>
            <AlertTriangle className="w-4 h-4 mr-1" /> Nova Punição
          </Button>
          {punishments.map(p => {
            const comp = leagues.find(l => l.id === p.league_id || l.id === p.competition_id);
            return (
              <div key={p.id} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{p.team_nome}</p>
                  <p className="text-xs text-muted-foreground">{p.descricao}</p>
                  <p className="text-[10px] text-muted-foreground">{p.category || p.tipo} {comp ? `· ${comp.nome}` : ''}</p>
                </div>
                <div className="text-right">
                  {(p.pontos_perdidos > 0 || p.points_delta > 0) && <Badge variant="outline" className="text-destructive block">-{p.points_delta || p.pontos_perdidos} pts</Badge>}
                  {(p.valor_multa > 0 || p.financial_amount > 0) && <span className="text-[10px] text-destructive">€{(p.financial_amount || p.valor_multa)?.toLocaleString()}</span>}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="zonas" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Zonas da Tabela</h3>
            <Button size="sm" onClick={() => setZoneOpen(!zoneOpen)}>
              <Layers className="w-4 h-4 mr-1" /> Nova Zona
            </Button>
          </div>
          {zoneOpen && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div>
                <Label>Competição</Label>
                <Select value={zoneCompId} onValueChange={setZoneCompId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome da zona</Label><Input value={zoneForm.nome} onChange={e => setZoneForm({...zoneForm, nome: e.target.value})} placeholder="Ex: Campeão" /></div>
                <div><Label>Cor</Label><input type="color" value={zoneForm.cor} onChange={e => setZoneForm({...zoneForm, cor: e.target.value})} className="w-full h-9 rounded-md border border-input bg-transparent cursor-pointer" /></div>
                <div><Label>Pos. início</Label><Input type="number" min={1} value={zoneForm.pos_inicio} onChange={e => setZoneForm({...zoneForm, pos_inicio: parseInt(e.target.value)||1})} /></div>
                <div><Label>Pos. fim</Label><Input type="number" min={1} value={zoneForm.pos_fim} onChange={e => setZoneForm({...zoneForm, pos_fim: parseInt(e.target.value)||1})} /></div>
              </div>
              <div><Label>Descrição</Label><Input value={zoneForm.descricao} onChange={e => setZoneForm({...zoneForm, descricao: e.target.value})} placeholder="Ex: Classificação para a Champions" /></div>
              <Button size="sm" className="w-full" onClick={() => createZone.mutate({...zoneForm, competition_id: zoneCompId})} disabled={!zoneForm.nome || !zoneCompId}>Salvar Zona</Button>
            </div>
          )}
          <div className="space-y-2">
            {zones.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma zona cadastrada.</p>}
            {zones.map(z => {
              const comp = leagues.find(l => l.id === z.competition_id);
              return (
                <div key={z.id} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: z.cor }} />
                    <div>
                      <p className="text-sm font-medium">{z.nome} <span className="text-[10px] text-muted-foreground">(pos. {z.pos_inicio}–{z.pos_fim})</span></p>
                      <p className="text-[10px] text-muted-foreground">{comp ? comp.nome : ''} {z.descricao ? `· ${z.descricao}` : ''}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteZone.mutate(z.id)}><AlertTriangle className="w-3 h-3" /></Button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="negs" className="mt-4 space-y-2">
          {negotiations.map(n => (
            <div key={n.id} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{n.player_nome}</p>
                <p className="text-[10px] text-muted-foreground">{n.comprador_team_nome} ← {n.vendedor_team_nome} · €{n.valor_proposta?.toLocaleString()}</p>
              </div>
              <Badge variant="outline" className="text-[9px]">{n.status}</Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="logs" className="mt-4 space-y-2">
          {logs.map(l => (
            <div key={l.id} className="bg-card rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[9px]">{l.tipo}</Badge>
                <span className="text-[10px] text-muted-foreground">{l.usuario_email}</span>
              </div>
              <p className="text-xs">{l.descricao}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(l.created_date).toLocaleString('pt-BR')}</p>
            </div>
          ))}
          {logs.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Nenhum log registrado</p>}
        </TabsContent>
      </Tabs>

      <Dialog open={punishOpen} onOpenChange={setPunishOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Punição</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Competição</Label>
              <Select value={punishment.league_id} onValueChange={v => setPunishment({...punishment, league_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione a competição" /></SelectTrigger>
                <SelectContent>{leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Time</Label>
              <Select value={punishment.team_id} onValueChange={v => setPunishment({...punishment, team_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione o time" /></SelectTrigger>
                <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={punishment.category} onValueChange={v => setPunishment({...punishment, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pontos">Pontos</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="disciplinar">Disciplinar</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={punishment.tipo} onValueChange={v => setPunishment({...punishment, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="perda_pontos">Perda de Pontos</SelectItem>
                    <SelectItem value="multa_financeira">Multa Financeira</SelectItem>
                    <SelectItem value="suspensao">Suspensão</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Input value={punishment.descricao} onChange={e => setPunishment({...punishment, descricao: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Pontos perdidos</Label><Input type="number" min={0} value={punishment.pontos_perdidos} onChange={e => setPunishment({...punishment, pontos_perdidos: parseInt(e.target.value)||0, points_delta: parseInt(e.target.value)||0})} /></div>
              <div><Label>Multa (€)</Label><Input type="number" min={0} value={punishment.valor_multa} onChange={e => setPunishment({...punishment, valor_multa: parseFloat(e.target.value)||0, financial_amount: parseFloat(e.target.value)||0})} /></div>
            </div>
            <Button onClick={() => createPunishment.mutate(punishment)} className="w-full" disabled={!punishment.team_id}>Aplicar Punição</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
