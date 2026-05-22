import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Search, LayoutGrid, List, Pencil, Trash2 } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import PlayerAvatar from '../components/ui/PlayerAvatar';
import TeamFormDialog from '../components/teams/TeamFormDialog';

const SORT_OPTIONS = [
  { value: 'nome', label: 'Alfabética' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'valor_clube', label: 'Valor do Clube' },
];

export default function Teams() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('nome');
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grade');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list(),
  });

  const saveTeam = useMutation({
    mutationFn: (data) => editTarget
      ? base44.entities.Team.update(editTarget.id, data)
      : base44.entities.Team.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); setDialogOpen(false); setEditTarget(null); },
  });

  const deleteTeam = useMutation({
    mutationFn: (id) => base44.entities.Team.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });

  const openCreate = () => { setEditTarget(null); setDialogOpen(true); };
  const openEdit = (t, e) => { e.preventDefault(); e.stopPropagation(); setEditTarget(t); setDialogOpen(true); };
  const handleDelete = (id, e) => { e.preventDefault(); e.stopPropagation(); if (confirm('Excluir este time?')) deleteTeam.mutate(id); };

  const formatMoney = (v) => {
    if (!v) return '€0';
    if (v >= 1000000) return `€${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `€${(v / 1000).toFixed(0)}K`;
    return `€${v}`;
  };

  let filtered = teams.filter(t => {
    const matchSearch = !search || t.nome?.toLowerCase().includes(search.toLowerCase());
    const matchLeague = leagueFilter === 'all' || t.league_id === leagueFilter;
    return matchSearch && matchLeague;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'nome') return (a.nome || '').localeCompare(b.nome || '');
    if (sortBy === 'orcamento') return (b.orcamento || 0) - (a.orcamento || 0);
    if (sortBy === 'valor_clube') return (b.valor_clube || 0) - (a.valor_clube || 0);
    return 0;
  });

  const getTeamIndex = (id) => {
    const sorted = [...teams].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    const idx = sorted.findIndex(t => t.id === id);
    return idx >= 0 ? `T${idx + 1}` : '';
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Times</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Todos os clubes ({teams.length})</p>
        </div>
        {user?.role === 'admin' && (
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Novo Time</Button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar times..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary border-0" />
        </div>
        <Select value={leagueFilter} onValueChange={setLeagueFilter}>
          <SelectTrigger className="w-44 bg-secondary border-0"><SelectValue placeholder="Todas as ligas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ligas</SelectItem>
            {leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 bg-secondary border-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('grade')} className={`px-3 py-2 text-xs transition-colors ${viewMode === 'grade' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('lista')} className={`px-3 py-2 text-xs transition-colors ${viewMode === 'lista' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grade View */}
      {viewMode === 'grade' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(team => (
            <Link key={team.id} to={`/times/${team.id}`} className="block group">
              <div className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <PlayerAvatar foto_url={team.escudo_url} nome={team.nome} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold group-hover:text-primary transition-colors truncate">{team.nome}</h3>
                    <p className="text-xs text-muted-foreground truncate">{leagues.find(l => l.id === team.league_id)?.nome || '—'}</p>
                    {team.player_email && <Badge variant="outline" className="text-[9px] mt-1 truncate max-w-full">{team.player_email}</Badge>}
                    {user?.role === 'admin' && <span className="text-[9px] text-muted-foreground ml-1">{getTeamIndex(team.id)}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-center p-2 rounded-lg bg-secondary/50">
                    <p className="text-[10px] text-muted-foreground">Orçamento</p>
                    <p className="text-xs font-bold text-accent">{formatMoney(team.orcamento)}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-secondary/50">
                    <p className="text-[10px] text-muted-foreground">Valor</p>
                    <p className="text-xs font-bold text-primary">{formatMoney(team.valor_clube)}</p>
                  </div>
                </div>
                {user?.role === 'admin' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]" onClick={(e) => openEdit(team, e)}>
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive hover:bg-destructive/10" onClick={(e) => handleDelete(team.id, e)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Lista View */}
      {viewMode === 'lista' && (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 py-2.5 text-left">Time</th>
                <th className="px-3 py-2.5 text-left hidden sm:table-cell">Liga</th>
                <th className="px-3 py-2.5 text-left hidden md:table-cell">Status</th>
                <th className="px-3 py-2.5 text-right">Orçamento</th>
                <th className="px-3 py-2.5 text-right hidden sm:table-cell">Valor</th>
                {user?.role === 'admin' && <th className="px-3 py-2.5 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(team => (
                <tr key={team.id} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                  <td className="px-3 py-2.5">
                    <Link to={`/times/${team.id}`} className="flex items-center gap-2 hover:text-primary">
                      <PlayerAvatar foto_url={team.escudo_url} nome={team.nome} size="sm" />
                      <div>
                        <span className="font-medium">{team.nome}</span>
                        {user?.role === 'admin' && <span className="text-muted-foreground ml-1">{getTeamIndex(team.id)}</span>}
                        {team.player_email && <p className="text-[10px] text-muted-foreground">{team.player_email}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{leagues.find(l => l.id === team.league_id)?.nome || '—'}</td>
                  <td className="px-3 py-2.5 hidden md:table-cell"><Badge variant="outline" className="text-[9px]">Ativo</Badge></td>
                  <td className="px-3 py-2.5 text-right font-bold text-accent">{formatMoney(team.orcamento)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-primary hidden sm:table-cell">{formatMoney(team.valor_clube)}</td>
                  {user?.role === 'admin' && (
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => openEdit(team, e)}><Pencil className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={(e) => handleDelete(team.id, e)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-10">Nenhum time encontrado</p>}
        </div>
      )}

      <TeamFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        editTarget={editTarget}
        onSave={(data) => saveTeam.mutate(data)}
        leagues={leagues}
      />
    </div>
  );
}