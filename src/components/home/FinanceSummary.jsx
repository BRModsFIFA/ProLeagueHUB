import React from 'react';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export default function FinanceSummary({ finances = [], team }) {
  const receitas = finances.filter(f => f.tipo === 'receita').reduce((sum, f) => sum + (f.valor || 0), 0);
  const despesas = finances.filter(f => f.tipo === 'despesa').reduce((sum, f) => sum + (f.valor || 0), 0);
  const saldo = (team?.orcamento || 0);

  const formatMoney = (v) => {
    if (v >= 1000000) return `€${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `€${(v / 1000).toFixed(0)}K`;
    return `€${v.toLocaleString()}`;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-accent" />
        Finanças Resumidas
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Receitas</span>
          </div>
          <span className="text-sm font-bold text-primary">{formatMoney(receitas)}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Despesas</span>
          </div>
          <span className="text-sm font-bold text-destructive">{formatMoney(despesas)}</span>
        </div>
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Saldo Atual</span>
          <span className={`text-lg font-bold ${saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatMoney(saldo)}</span>
        </div>
      </div>
    </div>
  );
}