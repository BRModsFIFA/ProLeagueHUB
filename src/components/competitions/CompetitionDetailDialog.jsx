import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, DollarSign, Check, X } from 'lucide-react';

const STATUS_COLORS = {
  pendente: 'bg-accent/10 text-accent',
  aprovado: 'bg-primary/10 text-primary',
  recusado: 'bg-destructive/10 text-destructive',
  pago: 'bg-chart-3/10 text-chart-3',
  isento: 'bg-secondary text-muted-foreground',
};

export default function CompetitionDetailDialog({ league, teams, registrations, user, userTeam, onClose }) {
  const queryClient = useQueryClient();
  const leagueRegs = registrations.filter(r => r.competition_id === league.id);
  const leagueTeams = teams.filter(t => t.league_id === league.id);

  const formatBRL = (v) => v ? `R$ ${Number(v).toLocaleString('pt-BR')}` : 'R$ 0';

  const updateReg = useMutation({
    mutationFn: ({ id, status }) => base44.entities.CompetitionRegistration.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations'] }),
  });

  const registerTeam = useMutation({
    mutationFn: () => base44.entities.CompetitionRegistration.create({
      competition_id: league.id,
      team_id: userTeam.id,
      team_nome: userTeam.nome,
      user_email: user?.email,
      registration_fee_brl: league.registration_fee_brl || 0,
      status: 'pendente',
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations'] }),
  });

  const isRegistered = userTeam && leagueRegs.some(r => r.team_id === userTeam.id);

  return (
    <Dialog open={!!league} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {league.logo_url && <img src={league.logo_url} className="w-6 h-6 rounded" alt="" />}
            {league.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Premiação</p>
              <p className="text-sm font-bold text-accent">{formatBRL(league.prize_pool_brl)}</p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Taxa</p>
              <p className="text-sm font-bold">{formatBRL(league.registration_fee_brl)}</p>
            </div>
          </div>

          {userTeam && league.registration_status === 'aberto' && !isRegistered && (
            <Button className="w-full" onClick={() => registerTeam.mutate()} disabled={registerTeam.isPending}>
              Inscrever {userTeam.nome}
            </Button>
          )}
          {isRegistered && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center text-sm text-primary">
              Seu time está inscrito nesta competição
            </div>
          )}

          {/* Teams in competition */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Times Participantes ({leagueTeams.length})
            </h4>
            <div className="space-y-1.5">
              {leagueTeams.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2">
                  <span className="text-xs font-medium">{t.nome}</span>
                </div>
              ))}
              {leagueTeams.length === 0 && <p className="text-xs text-muted-foreground">Nenhum time nesta competição</p>}
            </div>
          </div>

          {/* Registrations — admin only */}
          {user?.role === 'admin' && leagueRegs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Inscrições ({leagueRegs.length})
              </h4>
              <div className="space-y-1.5">
                {leagueRegs.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">{r.team_nome}</p>
                      <p className="text-[10px] text-muted-foreground">{r.user_email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[r.status]}`}>{r.status}</Badge>
                      {r.status === 'pendente' && (
                        <>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-primary" onClick={() => updateReg.mutate({ id: r.id, status: 'aprovado' })}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => updateReg.mutate({ id: r.id, status: 'recusado' })}>
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}