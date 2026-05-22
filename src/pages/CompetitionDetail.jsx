import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy } from 'lucide-react';
import CompDetailOverview from '../components/competitionDetail/CompDetailOverview';
import CompDetailTable from '../components/competitionDetail/CompDetailTable';
import CompDetailScorers from '../components/competitionDetail/CompDetailScorers';
import CompDetailMatches from '../components/competitionDetail/CompDetailMatches';
import CompDetailNews from '../components/competitionDetail/CompDetailNews';
import CompDetailRegistrations from '../components/competitionDetail/CompDetailRegistrations';
import CompDetailRules from '../components/competitionDetail/CompDetailRules';
import RegistrationModal from '../components/competitions/RegistrationModal';

const STATUS_COLORS = {
  ativa: 'bg-primary/10 text-primary',
  pausada: 'bg-accent/10 text-accent',
  encerrada: 'bg-secondary text-muted-foreground',
};
const STATUS_LABELS = { ativa: 'Em andamento', pausada: 'Pausada', encerrada: 'Encerrada' };

export default function CompetitionDetail() {
  const { id } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('visao_geral');
  const [regModalOpen, setRegModalOpen] = useState(false);

  const { data: leagues = [] } = useQuery({ queryKey: ['leagues'], queryFn: () => base44.entities.League.list() });
  const { data: teams = [] } = useQuery({ queryKey: ['teams'], queryFn: () => base44.entities.Team.list() });
  const { data: matches = [] } = useQuery({ queryKey: ['matches'], queryFn: () => base44.entities.Match.list('-rodada', 500) });
  const { data: registrations = [] } = useQuery({ queryKey: ['registrations'], queryFn: () => base44.entities.CompetitionRegistration.list() });
  const { data: matchEvents = [] } = useQuery({ queryKey: ['matchEvents'], queryFn: () => base44.entities.MatchEvent.list() });
  const { data: punishments = [] } = useQuery({ queryKey: ['punishments'], queryFn: () => base44.entities.Punishment.list('-created_date', 200) });
  const { data: zones = [] } = useQuery({ queryKey: ['tableZones'], queryFn: () => base44.entities.TableZone.list() });
  const { data: news = [] } = useQuery({ queryKey: ['compNews'], queryFn: () => base44.entities.CompetitionNews.list('-created_date', 100) });

  const league = leagues.find(l => l.id === id);
  const userTeam = teams.find(t => t.player_email === user?.email);

  const leagueTeams = teams.filter(t => t.league_id === id);
  const leagueMatches = matches.filter(m => m.league_id === id);
  const leagueRegs = registrations.filter(r => r.competition_id === id);
  const leaguePunishments = punishments.filter(p => p.league_id === id || p.competition_id === id);
  const leagueZones = zones.filter(z => z.competition_id === id && z.ativa !== false);
  const leagueNews = news.filter(n => n.competition_id === id);

  const registerTeam = useMutation({
    mutationFn: (team) => base44.entities.CompetitionRegistration.create({
      competition_id: id,
      team_id: (team || userTeam).id,
      team_nome: (team || userTeam).nome,
      user_id: user?.id || '',
      user_email: user?.email || '',
      registration_fee_brl: (team || userTeam).registration_fee_brl || 0,
      team_registration_fee_brl: (team || userTeam).registration_fee_brl || 0,
      status: 'pendente',
      payment_status: 'pendente',
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['registrations'] }); setRegModalOpen(false); },
  });

  if (!league) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-4 h-64">
        <Trophy className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Competição não encontrada</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/competicoes')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/competicoes')} className="mt-0.5 flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          {league.emoji ? (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-3xl">{league.emoji}</div>
          ) : league.logo_url ? (
            <img src={league.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-border" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{league.nome}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{league.temporada}</span>
              <Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[league.status]}`}>
                {STATUS_LABELS[league.status] || league.status}
              </Badge>
              {league.pais && <span className="text-[10px] text-muted-foreground">🌍 {league.pais}</span>}
            </div>
            {league.descricao && (
              <p className="text-xs text-muted-foreground mt-2 max-w-2xl">{league.descricao}</p>
            )}
            {league.league_id && user?.role === 'admin' && (
              <span className="text-[10px] text-muted-foreground mt-1 block">ID: {league.league_id}</span>
            )}
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <RegistrationModal
        open={regModalOpen}
        onClose={() => setRegModalOpen(false)}
        league={league}
        teams={teams}
        registrations={registrations}
        user={user}
        onConfirm={(team) => registerTeam.mutate(team)}
        isConfirming={registerTeam.isPending}
      />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary flex-wrap h-auto gap-1">
          <TabsTrigger value="visao_geral" className="text-xs">Visão Geral</TabsTrigger>
          <TabsTrigger value="tabela" className="text-xs">Tabela</TabsTrigger>
          <TabsTrigger value="artilharia" className="text-xs">Artilharia</TabsTrigger>
          <TabsTrigger value="partidas" className="text-xs">Partidas</TabsTrigger>
          <TabsTrigger value="noticias" className="text-xs">Notícias</TabsTrigger>
          <TabsTrigger value="inscricoes" className="text-xs">Inscrições</TabsTrigger>
          <TabsTrigger value="regras" className="text-xs">Regras</TabsTrigger>
        </TabsList>

        <TabsContent value="visao_geral" className="mt-4">
          <CompDetailOverview
            league={league}
            leagueTeams={leagueTeams}
            leagueMatches={leagueMatches}
            leagueRegs={leagueRegs}
            userTeam={userTeam}
            user={user}
            onRegister={() => registerTeam.mutate()}
            registering={registerTeam.isPending}
          />
        </TabsContent>

        <TabsContent value="tabela" className="mt-4">
          <CompDetailTable
            league={league}
            leagueTeams={leagueTeams}
            leagueMatches={leagueMatches}
            leaguePunishments={leaguePunishments}
            leagueZones={leagueZones}
            userTeam={userTeam}
          />
        </TabsContent>

        <TabsContent value="artilharia" className="mt-4">
          <CompDetailScorers
            leagueMatches={leagueMatches}
            matchEvents={matchEvents}
            teams={teams}
          />
        </TabsContent>

        <TabsContent value="partidas" className="mt-4">
          <CompDetailMatches
            leagueMatches={leagueMatches}
            league={league}
            leagueTeams={leagueTeams}
            user={user}
          />
        </TabsContent>

        <TabsContent value="noticias" className="mt-4">
          <CompDetailNews
            leagueNews={leagueNews}
            league={league}
            user={user}
            queryClient={queryClient}
          />
        </TabsContent>

        <TabsContent value="inscricoes" className="mt-4">
          <CompDetailRegistrations
            league={league}
            leagueRegs={leagueRegs}
            teams={teams}
            user={user}
            userTeam={userTeam}
            onRegister={() => registerTeam.mutate()}
            registering={registerTeam.isPending}
            queryClient={queryClient}
          />
        </TabsContent>

        <TabsContent value="regras" className="mt-4">
          <CompDetailRules
            league={league}
            leagueZones={leagueZones}
            user={user}
            zones={zones}
            queryClient={queryClient}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}