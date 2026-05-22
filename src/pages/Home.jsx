import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield } from 'lucide-react';
import KpiStrip from '../components/home/KpiStrip';
import NextMatches from '../components/home/NextMatches';
import RecentResults from '../components/home/RecentResults';
import RecentNotifications from '../components/home/RecentNotifications';
import ActiveNegotiations from '../components/home/ActiveNegotiations';
import StandingsSummary from '../components/home/StandingsSummary';
import FinanceSummary from '../components/home/FinanceSummary';

export default function Home() {
  const { user } = useOutletContext();

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const userTeam = teams.find(t =>
    t.owner_user_id === user?.id ||
    t.player_email === user?.email ||
    t.owner_email === user?.email
  );

  const { data: matches = [] } = useQuery({
    queryKey: ['matches'],
    queryFn: () => base44.entities.Match.list('-rodada', 50),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ destinatario_email: user?.email }, '-created_date', 10),
    enabled: !!user?.email,
  });

  const { data: negotiations = [] } = useQuery({
    queryKey: ['negotiations'],
    queryFn: () => base44.entities.Negotiation.filter({ status: 'pendente' }, '-created_date', 10),
  });

  const { data: finances = [] } = useQuery({
    queryKey: ['finances', userTeam?.id],
    queryFn: () => base44.entities.Finance.filter({ team_id: userTeam?.id }, '-created_date', 20),
    enabled: !!userTeam?.id,
  });

  const pendingMatches = userTeam
    ? matches.filter(m =>
        (m.status === 'pendente' || m.status === 'agendado') &&
        (m.home_team_id === userTeam.id || m.away_team_id === userTeam.id)
      ).length
    : 0;
  const unreadNotifications = notifications.filter(n => !n.lida).length;
  const upcomingMatches = matches.filter(m => m.status === 'pendente' || m.status === 'agendado');
  const recentResults = matches.filter(m => m.status === 'aprovado');

  const { data: league } = useQuery({
    queryKey: ['league'],
    queryFn: async () => {
      const leagues = await base44.entities.League.list('-created_date', 1);
      return leagues[0] || null;
    },
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {userTeam?.escudo_url ? (
            <img src={userTeam.escudo_url} className="w-12 h-12 rounded-xl object-cover border border-border" alt="" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-xs">Olá, {user?.full_name || 'Treinador'}</p>
            <h1 className="text-xl font-bold text-foreground">{userTeam?.nome || 'Central de Comando'}</h1>
            <div className="flex items-center gap-3 mt-1">
              {league && (
                <>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{league.temporada}</span>
                  <span className="text-[10px] text-muted-foreground">Rodada {league.rodada_atual || 1}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <KpiStrip team={userTeam} notifications={unreadNotifications} pendingMatches={pendingMatches} />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <NextMatches matches={upcomingMatches} />
        <RecentResults matches={recentResults} />
        <RecentNotifications notifications={notifications} />
        <ActiveNegotiations negotiations={negotiations} />
        <StandingsSummary standings={[]} userTeamId={userTeam?.id} />
        <FinanceSummary finances={finances} team={userTeam} />
      </div>
    </div>
  );
}