import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRoundRobin(teams) {
  // Returns array of rounds, each round is array of [home, away] team pairs
  const n = teams.length;
  const rounds = [];
  const list = n % 2 === 0 ? [...teams] : [...teams, null]; // null = bye
  const total = list.length;

  for (let r = 0; r < total - 1; r++) {
    const round = [];
    for (let i = 0; i < total / 2; i++) {
      const home = list[i];
      const away = list[total - 1 - i];
      if (home && away) round.push([home, away]);
    }
    rounds.push(round);
    // Rotate all except first
    list.splice(1, 0, list.pop());
  }
  return rounds;
}

export default function MatchGeneratorModal({ open, onClose, mode, league, leagueTeams, leagueMatches, onGenerated }) {
  const [rodadaNum, setRodadaNum] = useState(1);
  const [loading, setLoading] = useState(false);
  const [conflictChoice, setConflictChoice] = useState(null); // 'replace' | 'complete' | null

  const teams = leagueTeams.filter(t => t.id);
  const existingRodadas = [...new Set(leagueMatches.map(m => m.rodada))].sort((a, b) => a - b);
  const hasConflict = mode === 'rodada' && leagueMatches.some(m => m.rodada === rodadaNum);
  const hasAnyMatches = leagueMatches.length > 0;

  const createMatches = async (pairs, rodada) => {
    for (const [home, away] of pairs) {
      await base44.entities.Match.create({
        league_id: league.id,
        rodada,
        home_team_id: home.id,
        home_team_nome: home.nome,
        home_team_escudo: home.escudo_url || '',
        away_team_id: away.id,
        away_team_nome: away.nome,
        away_team_escudo: away.escudo_url || '',
        status: 'pendente',
      });
    }
  };

  const handleGenerateRound = async (forceReplace = false) => {
    setLoading(true);
    const rodada = rodadaNum;

    // Delete existing matches in this round if replacing
    if (forceReplace) {
      const toDelete = leagueMatches.filter(m => m.rodada === rodada);
      for (const m of toDelete) await base44.entities.Match.delete(m.id);
    }

    // Get already played pairs (from other rounds) to avoid repeats
    const existingPairs = new Set(
      leagueMatches
        .filter(m => m.rodada !== rodada || forceReplace)
        .map(m => [m.home_team_id, m.away_team_id].sort().join('|'))
    );

    const shuffled = shuffleArray(teams);
    const allRounds = generateRoundRobin(shuffled);
    const turnoRounds = league.tipo_turno === 'turno_e_returno'
      ? [...allRounds, ...allRounds.map(r => r.map(([h, a]) => [a, h]))]
      : allRounds;

    // Find the round that has least conflicts
    let bestRound = turnoRounds[0] || [];
    const roundPairs = turnoRounds[(rodada - 1) % turnoRounds.length] || turnoRounds[0] || [];
    const newPairs = roundPairs.filter(([h, a]) => !existingPairs.has([h.id, a.id].sort().join('|')));

    await createMatches(newPairs, rodada);
    setLoading(false);
    onGenerated();
    onClose();
  };

  const handleGenerateAll = async (replace = false) => {
    setLoading(true);

    if (replace) {
      for (const m of leagueMatches) await base44.entities.Match.delete(m.id);
    }

    const shuffled = shuffleArray(teams);
    const allRounds = generateRoundRobin(shuffled);
    let rounds = league.tipo_turno === 'turno_e_returno'
      ? [...allRounds, ...allRounds.map(r => r.map(([h, a]) => [a, h]))]
      : allRounds;

    // For groups+knockout or pure knockout, just do round robin for now
    const existingPairsByRound = new Set(
      replace ? [] : leagueMatches.map(m => `${m.rodada}|${[m.home_team_id, m.away_team_id].sort().join('|')}`)
    );

    for (let i = 0; i < rounds.length; i++) {
      const rodada = i + 1;
      const pairs = rounds[i].filter(([h, a]) => {
        const key = `${rodada}|${[h.id, a.id].sort().join('|')}`;
        return !existingPairsByRound.has(key);
      });
      if (pairs.length > 0) {
        await createMatches(pairs, rodada);
      }
    }

    // Update league total rounds
    await base44.entities.League.update(league.id, { total_rodadas: rounds.length });

    setLoading(false);
    onGenerated();
    onClose();
  };

  if (mode === 'rodada') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Gerar Rodada</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Número da Rodada</Label>
              <Input type="number" min={1} value={rodadaNum} onChange={e => setRodadaNum(parseInt(e.target.value) || 1)} />
              <p className="text-[10px] text-muted-foreground mt-1">{teams.length} times disponíveis</p>
            </div>

            {hasConflict && !conflictChoice && (
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-accent">Já existem partidas na Rodada {rodadaNum}. O que deseja fazer?</p>
                <div className="flex flex-col gap-1.5">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setConflictChoice('replace')}>Substituir rodada</Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setConflictChoice('complete')}>Completar partidas faltantes</Button>
                  <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={onClose}>Cancelar</Button>
                </div>
              </div>
            )}

            {(!hasConflict || conflictChoice) && (
              <Button className="w-full" disabled={loading || teams.length < 2} onClick={() => handleGenerateRound(conflictChoice === 'replace')}>
                {loading ? 'Gerando...' : `Gerar Rodada ${rodadaNum}`}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // mode === 'completo'
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Gerar Calendário Completo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Times: <span className="font-semibold text-foreground">{teams.length}</span></p>
            <p>Formato: <span className="font-semibold text-foreground capitalize">{league.formato?.replace(/_/g, ' ') || 'pontos corridos'}</span></p>
            <p>Turno: <span className="font-semibold text-foreground">{league.tipo_turno === 'turno_e_returno' ? 'Turno e Returno' : 'Turno Único'}</span></p>
          </div>

          {hasAnyMatches ? (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-accent">Já existem {leagueMatches.length} partidas. O que deseja fazer?</p>
              <div className="flex flex-col gap-1.5">
                <Button size="sm" variant="outline" className="text-xs text-destructive border-destructive/30" disabled={loading} onClick={() => handleGenerateAll(true)}>
                  {loading ? 'Gerando...' : 'Apagar tudo e gerar novo'}
                </Button>
                <Button size="sm" variant="outline" className="text-xs" disabled={loading} onClick={() => handleGenerateAll(false)}>
                  {loading ? 'Gerando...' : 'Completar partidas faltantes'}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={onClose}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button className="w-full" disabled={loading || teams.length < 2} onClick={() => handleGenerateAll(false)}>
              {loading ? 'Gerando...' : 'Gerar Calendário Completo'}
            </Button>
          )}

          {teams.length < 2 && (
            <p className="text-xs text-destructive text-center">São necessários pelo menos 2 times inscritos.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}