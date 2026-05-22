import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, Lock, Clock } from 'lucide-react';
import { formatBRL } from '@/lib/teamFinancials';
import PlayerAvatar from '@/components/ui/PlayerAvatar';

export default function RegistrationModal({ open, onClose, league, teams, registrations, user, onConfirm, isConfirming }) {
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  // All teams eligible for this competition (in the same league or all if no filter)
  const leagueTeams = teams.filter(t => !league.id || true); // show all teams

  const getTeamStatus = (team) => {
    const reg = registrations.find(r => r.competition_id === league.id && r.team_id === team.id);
    if (!reg) return { label: 'Disponível', color: 'bg-primary/10 text-primary', available: true };
    if (reg.status === 'aprovado' || reg.status === 'pago' || reg.status === 'isento')
      return { label: 'Aprovado', color: 'bg-chart-3/10 text-chart-3', available: false };
    if (reg.status === 'pendente')
      return { label: 'Reservado', color: 'bg-accent/10 text-accent', available: false };
    if (reg.status === 'recusado')
      return { label: 'Disponível', color: 'bg-primary/10 text-primary', available: true };
    return { label: 'Indisponível', color: 'bg-secondary text-muted-foreground', available: false };
  };

  // Only show teams that belong to the user (check player_email or owner_email)
  const userTeam = teams.find(t => t.player_email === user?.email || t.owner_email === user?.email);

  const handleConfirm = () => {
    if (!selectedTeamId) return;
    const team = teams.find(t => t.id === selectedTeamId);
    onConfirm(team);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Escolha seu clube
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <p className="text-xs text-muted-foreground mb-3">
            Competição: <span className="font-semibold text-foreground">{league.nome}</span>
          </p>

          {leagueTeams.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum time disponível</p>
          )}

          {leagueTeams.map(team => {
            const status = getTeamStatus(team);
            const isUserTeam = team.player_email === user?.email || team.owner_email === user?.email;
            const isSelected = selectedTeamId === team.id;
            const canSelect = status.available;

            return (
              <div
                key={team.id}
                onClick={() => canSelect && setSelectedTeamId(isSelected ? null : team.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 cursor-pointer'
                    : canSelect
                    ? 'border-border hover:border-primary/40 cursor-pointer'
                    : 'border-border/50 opacity-60 cursor-not-allowed'
                }`}
              >
                <PlayerAvatar foto_url={team.escudo_url} nome={team.nome} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{team.nome}</p>
                    {isUserTeam && <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/20">Seu time</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-medium text-accent">{formatBRL(team.registration_fee_brl)}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <Badge variant="outline" className={`text-[9px] ${status.color}`}>
                    {status.label === 'Reservado' ? <Clock className="w-2.5 h-2.5 mr-0.5 inline" /> : null}
                    {status.label === 'Aprovado' ? <CheckCircle className="w-2.5 h-2.5 mr-0.5 inline" /> : null}
                    {status.label === 'Indisponível' ? <Lock className="w-2.5 h-2.5 mr-0.5 inline" /> : null}
                    {status.label}
                  </Badge>
                  {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" disabled={!selectedTeamId || isConfirming} onClick={handleConfirm}>
            {isConfirming ? 'Inscrevendo...' : 'Confirmar inscrição'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}