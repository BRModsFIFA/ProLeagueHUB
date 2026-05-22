import React from 'react';
import { Users, TrendingUp, Trophy, Wallet, Clock, Bell } from 'lucide-react';
import StatCard from '../ui/StatCard';

export default function KpiStrip({ team, notifications, pendingMatches }) {
  const formatMoney = (v) => {
    if (!v && v !== 0) return '—';
    if (v >= 1000000) return `€${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `€${(v / 1000).toFixed(0)}K`;
    return `€${v.toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <StatCard label="Orçamento" value={formatMoney(team?.orcamento)} icon={Wallet} variant="gold" />
      <StatCard label="Folha Salarial" value={formatMoney(team?.folha_salarial)} icon={Users} variant="default" />
      <StatCard label="Valor do Clube" value={formatMoney(team?.valor_clube)} icon={TrendingUp} variant="green" />
      <StatCard label="Posição" value="—" icon={Trophy} variant="blue" />
      <StatCard label="Jogos Pend." value={pendingMatches || 0} icon={Clock} variant="red" />
      <StatCard label="Notificações" value={notifications || 0} icon={Bell} variant="blue" />
    </div>
  );
}