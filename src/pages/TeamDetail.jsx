import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Shield, DollarSign, Users, TrendingUp, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PlayerAvatar from '../components/ui/PlayerAvatar';
import StatCard from '../components/ui/StatCard';
import { calcTeamFinancials, formatMoney } from '../lib/teamFinancials';

const positionGroups = {
  'Goleiros': ['GOL'],
  'Defensores': ['ZAG', 'LE', 'LD'],
  'Meio-Campistas': ['VOL', 'MC', 'ME', 'MD', 'MEI'],
  'Atacantes': ['PD', 'PE', 'SA', 'ATA']
};

const SORT_OPTIONS = [
{ value: 'posicao', label: 'Por posição' },
{ value: 'overall', label: 'Por overall' },
{ value: 'valor_base', label: 'Por valor' },
{ value: 'salario_base', label: 'Por salário' },
{ value: 'nome', label: 'Por nome' }];


export default function TeamDetail() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const teamId = new URLSearchParams(window.location.search).get('id') || window.location.pathname.split('/').pop();

  const [sortBy, setSortBy] = useState('posicao');
  const [editMulta, setEditMulta] = useState(null); // player object
  const [multaValue, setMultaValue] = useState('');

  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const teams = await base44.entities.Team.filter({ id: teamId });
      return teams[0];
    },
    enabled: !!teamId
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players', teamId],
    queryFn: () => base44.entities.PlayersDatabase.filter({ team_id: teamId }),
    enabled: !!teamId
  });

  const financials = team ? calcTeamFinancials(team, players) : { orcamento: 0, folhaSalarial: 0, valorClube: 0, margemFpf: 0 };

  // Ownership check: only player_email or owner_email (NOT auto-admin)
  const isOwner = team && (user?.email === team.player_email || user?.email === team.owner_email);
  const isAdmin = user?.role === 'admin';
  const canEdit = isOwner || isAdmin;

  const updatePlayer = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlayersDatabase.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['players', teamId] })
  });

  const saveMulta = () => {
    if (!editMulta) return;
    updatePlayer.mutate({ id: editMulta.id, data: { multa_rescisoria: parseFloat(multaValue) || 0 } });
    setEditMulta(null);
  };

  const sortPlayers = (arr) => {
    return [...arr].sort((a, b) => {
      if (sortBy === 'overall') return (b.overall || 0) - (a.overall || 0);
      if (sortBy === 'valor_base') return (b.valor_base || 0) - (a.valor_base || 0);
      if (sortBy === 'salario_base') return (b.salario_base || 0) - (a.salario_base || 0);
      if (sortBy === 'nome') return (a.nome_comum || a.nome || '').localeCompare(b.nome_comum || b.nome || '');
      return 0; // by position — handled by group
    });

  };

  const getOwnerLabel = () => {
    if (!team) return '';
    if (team.player_email === user?.email || team.owner_email === user?.email) return 'Você é o dono';
    if (!team.player_email && !team.owner_email && !team.owner_name) return 'Sem player';
    return `Dono: ${team.owner_name || team.player_email || ''}`;
  };

  if (!team) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <PlayerAvatar foto_url={team.escudo_url} nome={team.nome} size="xl" />
        <div>
          <h1 className="text-2xl font-bold">{team.nome}</h1>
          <p className="text-sm text-muted-foreground">{getOwnerLabel()}</p>
          {team.treinador && <p className="text-xs text-muted-foreground">Treinador: {team.treinador}</p>}
        </div>
      </div>

      {/* Financial Cards — calculated from players */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Orçamento" value={formatMoney(financials.orcamento)} icon={DollarSign} variant="gold" />
        <StatCard label="Folha Salarial" value={formatMoney(financials.folhaSalarial)} icon={Users} variant="default" />
        <StatCard label="Valor do Clube" value={formatMoney(financials.valorClube)} icon={TrendingUp} variant="green" />
        <StatCard label="Margem FPF" value={formatMoney(financials.margemFpf)} icon={Shield} variant="blue" />
      </div>

      {/* Squad Header + Sort */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#ffffff]">
          Elenco ({players.length})
        </h2>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 bg-secondary border-0 text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Squad by group */}
      {sortBy === 'posicao' ?
      Object.entries(positionGroups).map(([group, positions]) => {
        const groupPlayers = sortPlayers(players.filter((p) => positions.includes(p.posicao)));
        if (groupPlayers.length === 0) return null;
        return (
          <SquadSection key={group} group={group} players={groupPlayers} canEdit={canEdit}
          onUpdatePlayer={(id, data) => updatePlayer.mutate({ id, data })}
          onEditMulta={(p) => {setEditMulta(p);setMultaValue(String(p.multa_rescisoria || ''));}} />);

      }) :

      <SquadSection group={`Elenco (${players.length})`} players={sortPlayers(players)} canEdit={canEdit}
      onUpdatePlayer={(id, data) => updatePlayer.mutate({ id, data })}
      onEditMulta={(p) => {setEditMulta(p);setMultaValue(String(p.multa_rescisoria || ''));}} />
      }

      {players.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">Nenhum jogador no elenco</p>}

      {/* Edit Multa Dialog */}
      <Dialog open={!!editMulta} onOpenChange={() => setEditMulta(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Multa Rescisória</DialogTitle></DialogHeader>
          {editMulta &&
          <div className="space-y-4">
              <p className="text-sm font-medium">{editMulta.nome_comum || editMulta.nome}</p>
              <div>
                <Label>Multa Rescisória (€)</Label>
                <Input type="number" min={0} value={multaValue} onChange={(e) => setMultaValue(e.target.value)} placeholder="0" />
                <p className="text-[10px] text-muted-foreground mt-1">Deixe 0 para remover a multa</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setEditMulta(null)}>Cancelar</Button>
                <Button className="flex-1" onClick={saveMulta}>Salvar</Button>
              </div>
            </div>
          }
        </DialogContent>
      </Dialog>
    </div>);

}

function SquadSection({ group, players, canEdit, onUpdatePlayer, onEditMulta }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {group} ({players.length})
      </h3>
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-3 py-2.5 text-left">Jogador</th>
              <th className="px-3 py-2.5 text-center">POS</th>
              <th className="px-3 py-2.5 text-center hidden sm:table-cell">NAC</th>
              <th className="px-3 py-2.5 text-center">OVR</th>
              <th className="px-3 py-2.5 text-right hidden md:table-cell">Salário</th>
              <th className="px-3 py-2.5 text-right hidden md:table-cell">Valor</th>
              <th className="px-3 py-2.5 text-right hidden lg:table-cell">Multa</th>
              {canEdit && <th className="px-3 py-2.5 text-center">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {players.map((p) =>
            <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar foto_url={p.foto_url} nome={p.nome} size="sm" />
                    <span className="font-medium">{p.nome_comum || p.nome}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center"><Badge variant="outline" className="text-[10px]">{p.posicao}</Badge></td>
                <td className="px-3 py-2.5 text-center text-muted-foreground hidden sm:table-cell">{p.nacionalidade ? p.nacionalidade.substring(0, 3).toUpperCase() : '—'}</td>
                <td className="px-3 py-2.5 text-center font-bold">{p.overall || '—'}</td>
                <td className="px-3 py-2.5 text-right text-muted-foreground hidden md:table-cell">{formatMoney(p.salario_base)}</td>
                <td className="px-3 py-2.5 text-right hidden md:table-cell">{formatMoney(p.valor_base)}</td>
                <td className="px-3 py-2.5 text-right hidden lg:table-cell">
                  {p.multa_rescisoria ? formatMoney(p.multa_rescisoria) : <span className="text-muted-foreground">—</span>}
                </td>
                {canEdit &&
              <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <Button size="sm" variant={p.disponivel_venda ? 'default' : 'outline'} className="h-6 text-[10px] px-2"
                  onClick={() => onUpdatePlayer(p.id, { disponivel_venda: !p.disponivel_venda })}>
                        {p.disponivel_venda ? '✓ Venda' : 'Venda'}
                      </Button>
                      <Button size="sm" variant={p.disponivel_emprestimo ? 'default' : 'outline'} className="h-6 text-[10px] px-2"
                  onClick={() => onUpdatePlayer(p.id, { disponivel_emprestimo: !p.disponivel_emprestimo })}>
                        {p.disponivel_emprestimo ? '✓ Emp.' : 'Emp.'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Editar multa rescisória"
                  onClick={() => onEditMulta(p)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
              }
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>);

}