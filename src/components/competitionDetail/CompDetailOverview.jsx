import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Trophy, DollarSign, Calendar, CheckCircle, Lock } from 'lucide-react';

const CATEGORY_LABELS = {
  liga_domestica: 'Liga Doméstica',
  copa_domestica: 'Copa Doméstica',
  internacional: 'Internacional',
};

export default function CompDetailOverview({ league, leagueTeams, leagueMatches, leagueRegs, userTeam, user, onRegister, registering, allTeams = [] }) {
  const formatBRL = (v) => v ? `R$ ${Number(v).toLocaleString('pt-BR')}` : 'R$ 0';

  // Premiação Potencial = soma de TODOS os times da liga
  const premiacaoPotencial = leagueTeams.reduce((sum, t) => sum + (t.registration_fee_brl || 0), 0);

  const approvedRegs = leagueRegs.filter(r => ['aprovado', 'pago', 'isento'].includes(r.status));
  const paidRegs = leagueRegs.filter(r => ['pago', 'isento'].includes(r.payment_status) || ['pago', 'isento'].includes(r.status));
  const totalArrecadado = paidRegs.reduce((sum, r) => sum + (r.team_registration_fee_brl || r.registration_fee_brl || 0), 0);

  const isRegistered = userTeam && leagueRegs.some(r => r.team_id === userTeam.id);
  const regOpen = league.registration_status === 'aberto';

  const finishedMatches = leagueMatches.filter(m => ['finalizado', 'aprovado'].includes(m.status));
  // Find the lowest pending round and show only its matches
  const pendingMatches = leagueMatches.filter(m => ['pendente', 'agendado', 'auditoria'].includes(m.status));
  const minPendingRound = pendingMatches.length > 0 ? Math.min(...pendingMatches.map(m => m.rodada)) : null;
  const upcomingMatches = minPendingRound !== null
    ? pendingMatches.filter(m => m.rodada === minPendingRound).slice(0, 6)
    : [];
  const recentMatches = finishedMatches.slice(-4).reverse();

  return (
    <div className="space-y-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold">{leagueTeams.length}<span className="text-sm text-muted-foreground">/{league.max_times || '∞'}</span></p>
          <p className="text-[10px] text-muted-foreground">Times</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Calendar className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold">R{league.rodada_atual || 1}</p>
          <p className="text-[10px] text-muted-foreground">Rodada atual</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Trophy className="w-4 h-4 text-accent mx-auto mb-1" />
          <p className="text-sm font-bold text-accent">{formatBRL(premiacaoPotencial)}</p>
          <p className="text-[10px] text-muted-foreground">Premiação Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <DollarSign className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-sm font-bold text-primary">{formatBRL(totalArrecadado)}</p>
          <p className="text-[10px] text-muted-foreground">Total Arrecadado</p>
        </div>
      </div>

      {/* Categoria e info */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[league.categoria] || league.categoria}</Badge>
          <Badge variant="outline" className={`text-xs ${regOpen ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-secondary text-muted-foreground'}`}>
            {regOpen ? '🔓 Inscrições abertas' : '🔒 Inscrições fechadas'}
          </Badge>
          <span className="text-xs text-muted-foreground">Inscritos aprovados: {approvedRegs.length}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          A premiação total é formada pela soma das taxas de inscrição dos times participantes.
        </p>
      </div>

      {/* Inscrição do user */}
      {userTeam && regOpen && !isRegistered && (
        <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">Inscrever seu time</h3>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Time</span>
            <span className="font-medium">{userTeam.nome}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Prestígio</span>
            <span className="font-medium capitalize">{userTeam.prestige_level || 'prata'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Taxa de inscrição do time</span>
            <span className="font-bold text-accent">{formatBRL(userTeam.registration_fee_brl)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">A taxa de inscrição é definida por time e compõe a premiação total da liga.</p>
          <Button size="sm" className="w-full" onClick={onRegister} disabled={registering}>
            {registering ? 'Inscrevendo...' : `Inscrever ${userTeam.nome}`}
          </Button>
        </div>
      )}
      {isRegistered && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-2 text-sm text-primary">
          <CheckCircle className="w-4 h-4" /> Seu time está inscrito nesta competição
        </div>
      )}

      {/* Próximos jogos */}
      {upcomingMatches.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Próximos Jogos</h3>
          <div className="space-y-2">
            {upcomingMatches.map(m => (
              <div key={m.id} className="flex items-center justify-between text-xs bg-secondary/30 rounded-lg px-3 py-2">
                <span className="font-medium truncate flex-1">{m.home_team_nome}</span>
                <span className="text-muted-foreground mx-2">vs</span>
                <span className="font-medium truncate flex-1 text-right">{m.away_team_nome}</span>
                <Badge variant="outline" className="ml-2 text-[9px] flex-shrink-0">R{m.rodada}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimas partidas */}
      {recentMatches.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Últimas Partidas</h3>
          <div className="space-y-2">
            {recentMatches.map(m => (
              <div key={m.id} className="flex items-center justify-between text-xs bg-secondary/30 rounded-lg px-3 py-2">
                <span className="font-medium truncate flex-1">{m.home_team_nome}</span>
                <span className="font-bold mx-3 text-sm">{m.gols_home} – {m.gols_away}</span>
                <span className="font-medium truncate flex-1 text-right">{m.away_team_nome}</span>
                <Badge variant="outline" className="ml-2 text-[9px] flex-shrink-0">R{m.rodada}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}