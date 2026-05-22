/**
 * Centralized team financial calculations - used across TeamDetail, Finances, Profile
 */

export function calcTeamFinancials(team, players = []) {
  const teamPlayers = players.filter(p => p.team_id === team?.id);
  const folhaSalarial = teamPlayers.reduce((s, p) => s + (p.salario_base || 0), 0);
  const valorClube = teamPlayers.reduce((s, p) => s + (p.valor_base || 0), 0);
  const orcamento = team?.orcamento || 0;
  // FPF margin: budget minus salary bill
  const margemFpf = orcamento - folhaSalarial;

  return { orcamento, folhaSalarial, valorClube, margemFpf };
}

export function formatMoney(v) {
  if (!v && v !== 0) return '€0';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}€${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}€${(abs / 1000).toFixed(0)}K`;
  return `${sign}€${abs}`;
}

export function formatBRL(v) {
  if (!v) return 'R$ 0';
  return `R$ ${Number(v).toLocaleString('pt-BR')}`;
}