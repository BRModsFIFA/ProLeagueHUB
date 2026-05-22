import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Plus, Search } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import CompetitionCard from '../components/competitions/CompetitionCard';
import CompetitionDialog from '../components/competitions/CompetitionDialog';

const CATEGORY_LABELS = {
  liga_domestica: 'Liga Doméstica',
  copa_domestica: 'Copa Doméstica',
  internacional: 'Internacional',
};

const STATUS_LABELS = {
  ativa: 'Em andamento',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
};

export default function Competitions() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  // Detail is now handled by navigation to /competicoes/:id

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => base44.entities.CompetitionRegistration.list(),
  });

  const createLeague = useMutation({
    mutationFn: (data) => base44.entities.League.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leagues'] }); setDialogOpen(false); },
  });

  const updateLeague = useMutation({
    mutationFn: ({ id, data }) => base44.entities.League.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leagues'] }); setDialogOpen(false); setEditTarget(null); },
  });

  const deleteLeague = useMutation({
    mutationFn: (id) => base44.entities.League.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leagues'] }),
  });

  const toggleRegistration = useMutation({
    mutationFn: ({ id, status }) => base44.entities.League.update(id, { registration_status: status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leagues'] }),
  });

  const userTeam = teams.find(t => t.player_email === user?.email);

  const filtered = leagues.filter(l => {
    const matchSearch = !search || l.nome?.toLowerCase().includes(search.toLowerCase()) || l.pais?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || l.categoria === catFilter;
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const openCreate = () => { setEditTarget(null); setDialogOpen(true); };
  const openEdit = (l) => { setEditTarget(l); setDialogOpen(true); };
  const handleDelete = (id) => { if (confirm('Excluir esta competição?')) deleteLeague.mutate(id); };

  const handleSave = (data) => {
    if (editTarget) updateLeague.mutate({ id: editTarget.id, data });
    else createLeague.mutate(data);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" /> Competições
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{leagues.length} competições cadastradas</p>
        </div>
        {user?.role === 'admin' && (
          <Button size="sm" onClick={openCreate} className="gap-1">
            <Plus className="w-4 h-4" /> Nova Competição
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou país..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary border-0" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44 bg-secondary border-0"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            <SelectItem value="liga_domestica">Ligas Domésticas</SelectItem>
            <SelectItem value="copa_domestica">Copas Domésticas</SelectItem>
            <SelectItem value="internacional">Internacionais</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-secondary border-0"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="ativa">Em andamento</SelectItem>
            <SelectItem value="pausada">Pausada</SelectItem>
            <SelectItem value="encerrada">Encerrada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma competição encontrada</p>
          {user?.role === 'admin' && (
            <Button size="sm" variant="outline" className="mt-4" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Criar primeira competição
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(league => (
            <CompetitionCard
              key={league.id}
              league={league}
              teams={teams}
              registrations={registrations}
              user={user}
              userTeam={userTeam}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleRegistration={(id, status) => toggleRegistration.mutate({ id, status })}
            />
          ))}
        </div>
      )}

      <CompetitionDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        editTarget={editTarget}
        onSave={handleSave}
        existingLeagues={leagues}
      />


    </div>
  );
}