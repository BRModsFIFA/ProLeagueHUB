import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, Users, Calendar, DollarSign, Globe, Lock, Unlock, Pencil, Trash2, Eye } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import RegistrationModal from './RegistrationModal';

const CATEGORY_LABELS = {
  liga_domestica: 'Liga Doméstica',
  copa_domestica: 'Copa Doméstica',
  internacional: 'Internacional',
};

const CATEGORY_COLORS = {
  liga_domestica: 'bg-primary/10 text-primary border-primary/20',
  copa_domestica: 'bg-accent/10 text-accent border-accent/20',
  internacional: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
};

const STATUS_COLORS = {
  ativa: 'bg-primary/10 text-primary',
  pausada: 'bg-accent/10 text-accent',
  encerrada: 'bg-secondary text-muted-foreground',
};

const STATUS_LABELS = {
  ativa: 'Em andamento',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
};

export default function CompetitionCard({ league, teams, registrations, user, userTeam, onEdit, onDelete, onToggleRegistration }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [regModalOpen, setRegModalOpen] = useState(false);

  const leagueTeams = teams.filter(t => t.league_id === league.id);
  const leagueRegs = registrations.filter(r => r.competition_id === league.id);
  const registrationOpen = league.registration_status === 'aberto';

  // Check if current user's team already has a pending/approved reg
  const userTeamReg = userTeam ? leagueRegs.find(r => r.team_id === userTeam.id) : null;
  const isRegistered = !!userTeamReg && userTeamReg.status !== 'recusado';

  // Premiação Potencial = soma dos valores de inscrição de TODOS os times da liga
  const premiacaoPotencial = leagueTeams.reduce((sum, t) => sum + (t.registration_fee_brl || 0), 0);

  const formatBRL = (v) => {
    if (!v) return 'R$ 0';
    return `R$ ${Number(v).toLocaleString('pt-BR')}`;
  };

  const registerMutation = useMutation({
    mutationFn: (team) => base44.entities.CompetitionRegistration.create({
      competition_id: league.id,
      team_id: team.id,
      team_nome: team.nome,
      user_id: user?.id || '',
      user_email: user?.email || '',
      registration_fee_brl: team.registration_fee_brl || 0,
      team_registration_fee_brl: team.registration_fee_brl || 0,
      status: 'pendente',
      payment_status: 'pendente',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      setRegModalOpen(false);
    },
  });

  return (
    <div className="bg-card rounded-xl border border-border hover:border-primary/30 transition-all duration-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {league.emoji ? (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">{league.emoji}</div>
            ) : league.logo_url ? (
              <img src={league.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm leading-tight">{league.nome}</h3>
                {league.league_id && user?.role === 'admin' && <span className="text-[9px] text-muted-foreground">({league.league_id})</span>}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{league.temporada}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[league.status]}`}>
              {STATUS_LABELS[league.status] || league.status}
            </Badge>
            {registrationOpen && (
              <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-400 border-green-500/20">
                Inscrições abertas
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {league.categoria && (
            <Badge variant="outline" className={`text-[9px] ${CATEGORY_COLORS[league.categoria]}`}>
              {CATEGORY_LABELS[league.categoria] || league.categoria}
            </Badge>
          )}
          {league.pais && (
            <Badge variant="outline" className="text-[9px] text-muted-foreground">
              <Globe className="w-2.5 h-2.5 mr-0.5" />{league.pais}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-border/50 border-b border-border/50">
        <div className="p-3 text-center">
          <Users className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs font-bold">{leagueTeams.length}<span className="text-muted-foreground">/{league.max_times || '—'}</span></p>
          <p className="text-[9px] text-muted-foreground">Times</p>
        </div>
        <div className="p-3 text-center">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs font-bold">R{league.rodada_atual || 1}</p>
          <p className="text-[9px] text-muted-foreground">Rodada</p>
        </div>
        <div className="p-3 text-center">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs font-bold text-accent">{formatBRL(premiacaoPotencial)}</p>
          <p className="text-[9px] text-muted-foreground">Prem. Potencial</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]" onClick={() => navigate(`/competicoes/${league.id}`)}>
          <Eye className="w-3 h-3 mr-1" /> Ver Detalhes
        </Button>

        {user && registrationOpen && !isRegistered && (
          <Button size="sm" className="flex-1 h-7 text-[10px]" onClick={() => setRegModalOpen(true)}>
            <Plus className="w-3 h-3 mr-1" /> Inscrever-se
          </Button>
        )}
        {isRegistered && (
          <Badge variant="outline" className={`h-7 px-2 text-[10px] flex items-center ${userTeamReg?.status === 'aprovado' || userTeamReg?.status === 'pago' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
            {userTeamReg?.status === 'pendente' ? 'Inscr. Pendente' : 'Inscrito'}
          </Badge>
        )}

        {user?.role === 'admin' && (
          <>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(league)}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 px-2 text-[10px] text-muted-foreground"
              onClick={() => onToggleRegistration(league.id, registrationOpen ? 'fechado' : 'aberto')}
            >
              {registrationOpen ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(league.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>

      <RegistrationModal
        open={regModalOpen}
        onClose={() => setRegModalOpen(false)}
        league={league}
        teams={teams}
        registrations={registrations}
        user={user}
        onConfirm={(team) => registerMutation.mutate(team)}
        isConfirming={registerMutation.isPending}
      />
    </div>
  );
}
