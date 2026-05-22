import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Check, X, DollarSign, Users } from 'lucide-react';

const STATUS_COLORS = {
  pendente: 'bg-accent/10 text-accent',
  aprovado: 'bg-primary/10 text-primary',
  recusado: 'bg-destructive/10 text-destructive',
  pago: 'bg-chart-3/10 text-chart-3',
  isento: 'bg-secondary text-muted-foreground',
};

export default function CompDetailRegistrations({ league, leagueRegs, teams, user, userTeam, onRegister, registering, queryClient }) {
  const formatBRL = (v) => v ? `R$ ${Number(v).toLocaleString('pt-BR')}` : 'R$ 0';

  const updateReg = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CompetitionRegistration.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations'] }),
  });

  const isRegistered = userTeam && leagueRegs.some(r => r.team_id === userTeam.id);
  const regOpen = league.registration_status === 'aberto';

  const approvedRegs = leagueRegs.filter(r => ['aprovado', 'pago', 'isento'].includes(r.status));
  const totalArrecadado = approvedRegs.reduce((sum, r) => sum + (r.team_registration_fee_brl || r.registration_fee_brl || 0), 0);

  return (
    <div className="space-y-5">
      {/* Resumo financeiro */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold">{leagueRegs.length}</p>
          <p className="text-[10px] text-muted-foreground">Total inscritos</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-primary">{approvedRegs.length}</p>
          <p className="text-[10px] text-muted-foreground">Aprovados</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center col-span-2 md:col-span-1">
          <DollarSign className="w-4 h-4 text-accent mx-auto mb-1" />
          <p className="text-sm font-bold text-accent">{formatBRL(totalArrecadado)}</p>
          <p className="text-[10px] text-muted-foreground">Total arrecadado</p>
        </div>
      </div>

      {/* Botão de inscrição */}
      {userTeam && regOpen && !isRegistered && (
        <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">Inscrever-se</h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{userTeam.nome}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Prestígio</span><span className="font-medium capitalize">{userTeam.prestige_level || 'prata'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Taxa de inscrição</span><span className="font-bold text-accent">{formatBRL(userTeam.registration_fee_brl)}</span></div>
          </div>
          <p className="text-[10px] text-muted-foreground">A taxa é definida por time e compõe a premiação total da liga.</p>
          <Button size="sm" className="w-full" onClick={onRegister} disabled={registering}>
            {registering ? 'Inscrevendo...' : `Inscrever ${userTeam.nome}`}
          </Button>
        </div>
      )}

      {/* Lista de inscrições */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inscrições ({leagueRegs.length})</h3>
        {leagueRegs.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma inscrição ainda.</p>}
        {leagueRegs.map(r => {
          const team = teams.find(t => t.id === r.team_id);
          return (
            <div key={r.id} className="bg-card border border-border rounded-xl px-3 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{r.team_nome}</p>
                <p className="text-[10px] text-muted-foreground">{r.user_email}</p>
                <p className="text-[10px] text-accent font-medium mt-0.5">{formatBRL(r.team_registration_fee_brl || r.registration_fee_brl)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[r.status]}`}>{r.status}</Badge>
                <Badge variant="outline" className={`text-[9px] ${r.payment_status === 'pago' ? 'bg-primary/10 text-primary' : r.payment_status === 'isento' ? 'bg-secondary text-muted-foreground' : 'bg-accent/10 text-accent'}`}>
                  {r.payment_status || 'pendente'}
                </Badge>
                {user?.role === 'admin' && (
                  <div className="flex gap-1 flex-wrap justify-end mt-1">
                    {r.status === 'pendente' && (
                      <>
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] text-primary" onClick={() => updateReg.mutate({ id: r.id, data: { status: 'aprovado' } })}>✓ Aprovar</Button>
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] text-destructive" onClick={() => updateReg.mutate({ id: r.id, data: { status: 'recusado' } })}>✗ Recusar</Button>
                      </>
                    )}
                    {['aprovado', 'pendente'].includes(r.status) && r.payment_status !== 'pago' && (
                      <>
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] text-chart-3" onClick={() => updateReg.mutate({ id: r.id, data: { payment_status: 'pago', status: 'pago' } })}>💵 Pago</Button>
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] text-muted-foreground" onClick={() => updateReg.mutate({ id: r.id, data: { payment_status: 'isento', status: 'isento' } })}>Isento</Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}