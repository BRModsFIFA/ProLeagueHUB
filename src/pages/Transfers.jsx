import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { ArrowLeftRight, Search, Filter, Eye, ShoppingCart, Handshake, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import PlayerAvatar from '../components/ui/PlayerAvatar';

const POSITIONS = ['GOL', 'ZAG', 'LE', 'LD', 'VOL', 'MC', 'ME', 'MD', 'MEI', 'PD', 'PE', 'SA', 'ATA'];

export default function Transfers() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const [negotiationType, setNegotiationType] = useState('compra');
  const [negotiationMode, setNegotiationMode] = useState('direta');
  const [offerValue, setOfferValue] = useState(0);
  const [offerSalary, setOfferSalary] = useState(0);

  const [sortField, setSortField] = useState('nome');
  const [sortDir, setSortDir] = useState('asc');

  const { data: players = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.PlayersDatabase.list('nome', 1000)
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list()
  });

  const { data: negotiations = [] } = useQuery({
    queryKey: ['negotiations'],
    queryFn: () => base44.entities.Negotiation.list('-created_date', 50)
  });

  const userTeam = teams.find((t) => t.player_email === user?.email);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');else
    {setSortField(field);setSortDir('asc');}
  };

  const createNeg = useMutation({
    mutationFn: (data) => base44.entities.Negotiation.create(data),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['negotiations'] });setNegotiateOpen(false);}
  });

  const updateNeg = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Negotiation.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['negotiations'] })
  });

  const calcAge2 = (dob) => {
    if (!dob) return 0;
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  };

  let available = players.filter((p) => {
    const matchSearch = !search || p.nome?.toLowerCase().includes(search.toLowerCase()) || p.nome_comum?.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === 'all' || p.posicao === posFilter;
    return matchSearch && matchPos;
  });

  available = [...available].sort((a, b) => {
    let va, vb;
    if (sortField === 'nome') {va = (a.nome_comum || a.nome || '').toLowerCase();vb = (b.nome_comum || b.nome || '').toLowerCase();} else
    if (sortField === 'overall') {va = a.overall || 0;vb = b.overall || 0;} else
    if (sortField === 'valor') {va = a.valor_base || 0;vb = b.valor_base || 0;} else
    if (sortField === 'idade') {va = calcAge2(a.data_nascimento);vb = calcAge2(b.data_nascimento);} else
    {va = 0;vb = 0;}
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const formatMoney = (v) => {
    if (!v) return '€0';
    if (v >= 1000000) return `€${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `€${(v / 1000).toFixed(0)}K`;
    return `€${v}`;
  };

  const calcAge = (dob) => {
    if (!dob) return '—';
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / 31557600000);
  };

  const openNegotiate = (type) => {
    setNegotiationType(type);
    setOfferValue(type === 'multa_rescisoria' ? selected?.multa_rescisoria || 0 : selected?.valor_base || 0);
    setOfferSalary(selected?.salario_base || 0);
    setNegotiateOpen(true);
  };

  const submitNegotiation = () => {
    if (!userTeam || !selected) return;
    createNeg.mutate({
      player_id: selected.id,
      player_nome: selected.nome_comum || selected.nome,
      player_foto: selected.foto_url,
      comprador_team_id: userTeam.id,
      comprador_team_nome: userTeam.nome,
      vendedor_team_id: selected.team_id,
      vendedor_team_nome: selected.team_nome,
      tipo: negotiationType,
      modo: negotiationMode,
      valor_proposta: offerValue,
      salario_proposto: offerSalary
    });
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
      <h1 className="text-xl font-bold flex items-center gap-2 mb-6">
        <ArrowLeftRight className="w-5 h-5 text-primary" /> Transferências
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Player List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={`Buscar... (${available.length} jogadores)`} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-0" />
            </div>
            <Select value={posFilter} onValueChange={setPosFilter}>
              <SelectTrigger className="w-28 bg-secondary border-0"><SelectValue placeholder="Posição" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1 flex-wrap">
              {[{ f: 'overall', l: 'OVR' }, { f: 'valor', l: 'Valor' }, { f: 'idade', l: 'Idade' }, { f: 'nome', l: 'Nome' }].map(({ f, l }) =>
              <button key={f} onClick={() => toggleSort(f)}
              className={`px-2 py-1 text-[10px] rounded border transition-colors ${sortField === f ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border'}`}>
                  {l} {sortField === f ? sortDir === 'asc' ? '↑' : '↓' : ''}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {available.map((p) =>
            <div key={p.id} onClick={() => setSelected(p)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${selected?.id === p.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary/40'}`}>
                <PlayerAvatar foto_url={p.foto_url} nome={p.nome} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.nome_comum || p.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[9px]">{p.posicao}</Badge>
                    <span className="text-[10px] text-muted-foreground">{p.team_nome}</span>
                    <span className="text-[10px] text-muted-foreground">{calcAge(p.data_nascimento)} anos</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  
                  {p.disponivel_venda && <Badge className="text-[8px] bg-primary/10 text-primary">Venda</Badge>}
                  {p.disponivel_emprestimo && <Badge className="text-[8px] bg-chart-3/10 text-chart-3 ml-1">Emp.</Badge>}
                </div>
              </div>
            )}
            {available.length === 0 && <p className="text-center text-muted-foreground text-xs py-12">Nenhum jogador encontrado</p>}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="bg-card rounded-xl border border-border p-5 sticky top-20 h-fit">
          {selected ?
          <div className="space-y-5">
              <div className="text-center">
                <PlayerAvatar foto_url={selected.foto_url} nome={selected.nome} size="xl" />
                <h2 className="text-lg font-bold mt-3">{selected.nome_comum || selected.nome}</h2>
                <p className="text-xs text-muted-foreground">{selected.nacionalidade || '—'}</p>
                <Badge variant="outline" className="mt-2">{selected.posicao}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground">Clube</p>
                  <p className="text-xs font-medium">{selected.team_nome || '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground">Multa Resc.</p>
                  <p className="text-xs font-bold">{selected.multa_rescisoria ? formatMoney(selected.multa_rescisoria) : 'Não'}</p>
                </div>
              </div>
              <div className="space-y-2">
                {selected.disponivel_venda &&
              <Button className="w-full" size="sm" onClick={() => openNegotiate('compra')}>
                    <ShoppingCart className="w-4 h-4 mr-2" /> Comprar
                  </Button>
              }
                {selected.disponivel_emprestimo &&
              <Button variant="outline" className="w-full" size="sm" onClick={() => openNegotiate('emprestimo')}>
                    <Handshake className="w-4 h-4 mr-2" /> Empréstimo
                  </Button>
              }
                {selected.multa_rescisoria > 0 &&
              <Button variant="outline" className="w-full" size="sm" onClick={() => openNegotiate('multa_rescisoria')}>
                    <Banknote className="w-4 h-4 mr-2" /> Pagar Multa ({formatMoney(selected.multa_rescisoria)})
                  </Button>
              }
              </div>
            </div> :

          <div className="text-center py-12">
              <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Selecione um jogador</p>
            </div>
          }
        </div>
      </div>

      {/* Negotiate Dialog */}
      <Dialog open={negotiateOpen} onOpenChange={setNegotiateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Proposta — {selected?.nome_comum || selected?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Modo</Label>
              <Select value={negotiationMode} onValueChange={setNegotiationMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direta">Direta (sem limites)</SelectItem>
                  <SelectItem value="delegada">Delegada (com limites)</SelectItem>
                </SelectContent>
              </Select>
              {negotiationMode === 'delegada' &&
              <p className="text-[10px] text-muted-foreground mt-1">Compra: 90-125% do valor · Empréstimo: 0-10% do valor</p>
              }
            </div>
            <div><Label>Valor da Proposta (€)</Label><Input type="number" value={offerValue} onChange={(e) => setOfferValue(parseFloat(e.target.value))} /></div>
            <div><Label>Salário Proposto (€)</Label><Input type="number" value={offerSalary} onChange={(e) => setOfferSalary(parseFloat(e.target.value))} /></div>
            <Button onClick={submitNegotiation} className="w-full" disabled={!userTeam}>
              {userTeam ? 'Enviar Proposta' : 'Vincule-se a um time primeiro'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Negotiations */}
      {negotiations.length > 0 &&
      <div className="mt-8">
          <h2 className="text-sm font-semibold mb-4">Negociações Recentes</h2>
          <div className="space-y-2">
            {negotiations.slice(0, 10).map((n) =>
          <div key={n.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <PlayerAvatar foto_url={n.player_foto} nome={n.player_nome} size="sm" />
                  <div>
                    <p className="text-xs font-medium">{n.player_nome}</p>
                    <p className="text-[10px] text-muted-foreground">{n.comprador_team_nome} ← {n.vendedor_team_nome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-accent">{formatMoney(n.valor_proposta)}</span>
                  <Badge variant="outline" className={`text-[9px] ${
              n.status === 'aceito' ? 'bg-primary/10 text-primary' :
              n.status === 'recusado' ? 'bg-destructive/10 text-destructive' :
              n.status === 'contraproposta' ? 'bg-chart-3/10 text-chart-3' :
              'bg-secondary text-muted-foreground'}`
              }>{n.status}</Badge>
                  {n.status === 'pendente' && user?.email &&
              <div className="flex gap-1">
                      <Button size="sm" className="h-6 text-[10px]" onClick={() => updateNeg.mutate({ id: n.id, data: { status: 'aceito' } })}>Aceitar</Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateNeg.mutate({ id: n.id, data: { status: 'recusado' } })}>Recusar</Button>
                    </div>
              }
                </div>
              </div>
          )}
          </div>
        </div>
      }
    </div>);

}