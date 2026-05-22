import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Users, Shield } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { calcTeamFinancials, formatMoney } from '../lib/teamFinancials';

const COLORS = ['hsl(145,80%,50%)', 'hsl(45,90%,55%)', 'hsl(210,70%,55%)', 'hsl(280,60%,55%)', 'hsl(0,65%,55%)'];

const categoryLabels = {
  patrocinio: 'Patrocínio', tv: 'TV', merchandising: 'Merchandising', premiacao: 'Premiação',
  transferencia_entrada: 'Transf. Entrada', salario: 'Salários', multa: 'Multas',
  transferencia_saida: 'Transf. Saída', outro: 'Outros',
};

export default function Finances() {
  const { user } = useOutletContext();

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const userTeam = teams.find(t => t.player_email === user?.email);

  const { data: players = [] } = useQuery({
    queryKey: ['players', userTeam?.id],
    queryFn: () => base44.entities.PlayersDatabase.filter({ team_id: userTeam.id }),
    enabled: !!userTeam?.id,
  });

  const { data: finances = [] } = useQuery({
    queryKey: ['finances', userTeam?.id],
    queryFn: () => base44.entities.Finance.filter({ team_id: userTeam?.id }, '-created_date', 100),
    enabled: !!userTeam?.id,
  });

  const financials = userTeam ? calcTeamFinancials(userTeam, players) : null;

  const receitas = finances.filter(f => f.tipo === 'receita');
  const despesas = finances.filter(f => f.tipo === 'despesa');
  const totalReceitas = receitas.reduce((s, f) => s + (f.valor || 0), 0);
  const totalDespesas = despesas.reduce((s, f) => s + (f.valor || 0), 0);

  const byCategory = (items) => {
    const map = {};
    items.forEach(f => { map[f.categoria] = (map[f.categoria] || 0) + (f.valor || 0); });
    return Object.entries(map).map(([k, v]) => ({ name: categoryLabels[k] || k, value: v }));
  };

  const receitaData = byCategory(receitas);
  const despesaData = byCategory(despesas);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-accent" /> Finanças
      </h1>

      {!userTeam ? (
        <p className="text-sm text-muted-foreground text-center py-12">Vincule-se a um time para ver as finanças</p>
      ) : (
        <>
          {/* Club financial cards — same as TeamDetail */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Orçamento" value={formatMoney(financials.orcamento)} icon={Wallet} variant="gold" />
            <StatCard label="Folha Salarial" value={formatMoney(financials.folhaSalarial)} icon={Users} variant="default" />
            <StatCard label="Valor do Clube" value={formatMoney(financials.valorClube)} icon={TrendingUp} variant="green" />
            <StatCard label="Margem FPF" value={formatMoney(financials.margemFpf)} icon={Shield} variant="blue" />
          </div>

          {/* Revenue/Expense summary */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Receitas" value={formatMoney(totalReceitas)} icon={TrendingUp} variant="green" />
            <StatCard label="Despesas" value={formatMoney(totalDespesas)} icon={TrendingDown} variant="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Receitas Chart */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Receitas por Categoria
              </h3>
              {receitaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={receitaData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name }) => name}>
                      {receitaData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Sem receitas registradas</p>
              )}
            </div>

            {/* Despesas Chart */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" /> Despesas por Categoria
              </h3>
              {despesaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={despesaData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220,10%,55%)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(220,10%,55%)' }} />
                    <Tooltip formatter={(v) => formatMoney(v)} />
                    <Bar dataKey="value" fill="hsl(0,65%,55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Sem despesas registradas</p>
              )}
            </div>
          </div>

          {/* Transactions list */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-4">Movimentações Recentes</h3>
            <div className="space-y-2">
              {finances.slice(0, 15).map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
                  <div className="flex items-center gap-3">
                    {f.tipo === 'receita' ? <TrendingUp className="w-4 h-4 text-primary" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                    <div>
                      <p className="text-xs font-medium">{f.descricao || categoryLabels[f.categoria]}</p>
                      <p className="text-[10px] text-muted-foreground">{categoryLabels[f.categoria]}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${f.tipo === 'receita' ? 'text-primary' : 'text-destructive'}`}>
                    {f.tipo === 'receita' ? '+' : '-'}{formatMoney(f.valor)}
                  </span>
                </div>
              ))}
              {finances.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma movimentação</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}