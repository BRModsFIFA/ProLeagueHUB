import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, FileText, CheckCircle, XCircle } from 'lucide-react';

const FORMATO_LABELS = {
  pontos_corridos: 'Pontos Corridos',
  grupos_mata_mata: 'Fase de Grupos com Mata-Mata',
  mata_mata: 'Mata-Mata',
};

const CATEGORIA_LABELS = {
  liga_domestica: 'Liga Doméstica',
  copa_domestica: 'Copa Doméstica',
  internacional: 'Internacional',
};

const TURNO_LABELS = {
  turno_unico: 'Turno Único',
  turno_e_returno: 'Turno e Returno',
};

const CRITERIO_LABELS = {
  pontos: 'Pontos',
  vitorias: 'Vitórias',
  saldo_gols: 'Saldo de Gols',
  gols_pro: 'Gols Pró',
  gols_contra: 'Gols Sofridos',
  aproveitamento: 'Aproveitamento %',
  confronto_direto: 'Confronto Direto',
  menor_cartoes: 'Menor Nº de Cartões',
  sorteio: 'Sorteio',
};

function RuleRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium text-right ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function RuleToggle({ label, active, value, unit }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2">
        {active ? <CheckCircle className="w-3 h-3 text-primary" /> : <XCircle className="w-3 h-3 text-muted-foreground/50" />}
        <span className={active ? 'text-xs text-foreground' : 'text-xs text-muted-foreground/60'}>{label}</span>
      </div>
      {active && value !== undefined && (
        <span className="text-xs font-medium text-accent">{value}{unit ? ` ${unit}` : ''}</span>
      )}
      {!active && <span className="text-[10px] text-muted-foreground">Inativo</span>}
    </div>
  );
}

export default function CompDetailRules({ league, leagueZones, user, zones, queryClient }) {
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [zoneForm, setZoneForm] = useState({ nome: '', cor: '#22c55e', pos_inicio: 1, pos_fim: 1, descricao: '' });

  const createZone = useMutation({
    mutationFn: (data) => base44.entities.TableZone.create({ ...data, competition_id: league.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tableZones'] }); setShowZoneForm(false); setZoneForm({ nome: '', cor: '#22c55e', pos_inicio: 1, pos_fim: 1, descricao: '' }); },
  });

  const deleteZone = useMutation({
    mutationFn: (id) => base44.entities.TableZone.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tableZones'] }),
  });

  const criterios = Array.isArray(league.criterios_desempate) && league.criterios_desempate.length > 0
    ? league.criterios_desempate
    : ['pontos', 'vitorias', 'saldo_gols', 'gols_pro'];

  const numTeams = league.max_times || '—';
  const fmt = league.formato || 'pontos_corridos';

  // Calculate expected rounds
  let totalRodadas = league.total_rodadas || '—';
  if (fmt === 'pontos_corridos' && league.max_times) {
    const n = league.max_times;
    const baseRounds = n % 2 === 0 ? n - 1 : n;
    totalRodadas = league.tipo_turno === 'turno_e_returno' ? baseRounds * 2 : baseRounds;
  }

  return (
    <div className="space-y-5">
      {/* Dados Gerais */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-primary" /> Dados Gerais
        </h3>
        <div className="text-xs space-y-0">
          <RuleRow label="Nome" value={league.nome} />
          {league.descricao && <RuleRow label="Descrição" value={league.descricao} />}
          <RuleRow label="Temporada" value={league.temporada} />
          <RuleRow label="Categoria" value={CATEGORIA_LABELS[league.categoria] || league.categoria} />
          <RuleRow label="Formato" value={FORMATO_LABELS[fmt] || fmt} />
          {league.pais && <RuleRow label="País/Continente" value={league.pais} />}
          {league.nacionalidade_base && <RuleRow label="Nacionalidade base" value={league.nacionalidade_base} />}
          <RuleRow label="Máximo de times" value={numTeams} />
          <RuleRow label="Status" value={league.status === 'ativa' ? 'Em andamento' : league.status === 'pausada' ? 'Pausada' : 'Encerrada'} />
          <RuleRow label="Inscrições" value={league.registration_status === 'aberto' ? 'Abertas' : 'Fechadas'}
            highlight={league.registration_status === 'aberto'} />
          {league.league_id && <RuleRow label="ID da Liga" value={league.league_id} />}
        </div>
      </div>

      {/* Formato */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">Configurações do Formato</h3>
        <div className="text-xs space-y-0">
          {fmt === 'pontos_corridos' && (
            <>
              <RuleRow label="Tipo de turno" value={TURNO_LABELS[league.tipo_turno] || league.tipo_turno} />
              <RuleRow label="Equipes" value={numTeams} />
              <RuleRow label="Total de rodadas previstas" value={String(totalRodadas)} />
            </>
          )}

          {fmt === 'grupos_mata_mata' && (
            <>
              <RuleRow label="Equipes" value={numTeams} />
              <RuleRow label="Número de grupos" value={league.num_grupos || '—'} />
              <RuleRow label="Tipo de turno (grupos)" value={TURNO_LABELS[league.tipo_turno] || league.tipo_turno} />
              <RuleRow label="Classificados por grupo" value={league.classificados_por_grupo || '—'} />
              <RuleRow label="Partidas do mata-mata" value={league.mata_mata_partidas === 'ida_e_volta' ? 'Ida e Volta' : 'Jogo Único'} />
              <RuleRow label="Disputa 3º lugar" value={league.disputa_terceiro ? 'Sim' : 'Não'} />
              <RuleRow label="Final" value={league.final_jogo_unico ? 'Jogo Único' : 'Ida e Volta'} />
            </>
          )}

          {fmt === 'mata_mata' && (
            <>
              <RuleRow label="Equipes" value={numTeams} />
              <RuleRow label="Formato das partidas" value={league.mata_mata_partidas === 'ida_e_volta' ? 'Ida e Volta' : 'Jogo Único'} />
              <RuleRow label="Disputa 3º lugar" value={league.disputa_terceiro ? 'Sim' : 'Não'} />
              <RuleRow label="Final" value={league.final_jogo_unico ? 'Jogo Único' : 'Ida e Volta'} />
            </>
          )}
        </div>
      </div>

      {/* Critérios de Desempate */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">Critérios de Desempate</h3>
        <div className="flex flex-col gap-1.5">
          {criterios.map((c, i) => (
            <div key={c} className={`flex items-center gap-2 text-xs py-1 ${i === 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
              <span>{CRITERIO_LABELS[c] || c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Regras Adicionais */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">Regras Adicionais</h3>
        <div className="text-xs space-y-0">
          <RuleToggle label="Limite de Orçamento" active={league.regra_limite_orcamento_ativo}
            value={league.regra_limite_orcamento_pct} unit="% do orçamento" />
          <RuleToggle label="Caixa Mínimo" active={league.regra_caixa_minimo_ativo}
            value={league.regra_caixa_minimo_valor ? `€${Number(league.regra_caixa_minimo_valor).toLocaleString()}` : undefined} />
          <RuleToggle label="Limite de Elenco" active={league.regra_limite_elenco_ativo}
            value={league.regra_limite_elenco_qtd} unit="jogadores" />
          <RuleToggle label="Limite de Estrangeiros" active={league.regra_limite_estrangeiros_ativo}
            value={league.regra_limite_estrangeiros_qtd} unit="estrangeiros" />
        </div>
      </div>

      {/* Taxa de Inscrição */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2">Taxa de Inscrição</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          A taxa de inscrição é <strong className="text-foreground">individual por time</strong>, definida no cadastro de cada clube.
          A premiação total da liga é formada pela soma das taxas individuais dos clubes participantes aprovados.
        </p>
      </div>

      {/* Zonas da Tabela */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Zonas da Tabela</h3>
          {user?.role === 'admin' && (
            <Button size="sm" variant="outline" onClick={() => setShowZoneForm(!showZoneForm)}>
              <Plus className="w-3 h-3 mr-1" /> Zona
            </Button>
          )}
        </div>

        {showZoneForm && user?.role === 'admin' && (
          <div className="bg-secondary/40 rounded-lg p-3 space-y-2 border border-border">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Nome da zona</Label><Input value={zoneForm.nome} onChange={e => setZoneForm({ ...zoneForm, nome: e.target.value })} placeholder="Ex: Campeão" /></div>
              <div><Label className="text-xs">Cor</Label><input type="color" value={zoneForm.cor} onChange={e => setZoneForm({ ...zoneForm, cor: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent cursor-pointer" /></div>
              <div><Label className="text-xs">Pos. início</Label><Input type="number" min={1} value={zoneForm.pos_inicio} onChange={e => setZoneForm({ ...zoneForm, pos_inicio: parseInt(e.target.value) || 1 })} /></div>
              <div><Label className="text-xs">Pos. fim</Label><Input type="number" min={1} value={zoneForm.pos_fim} onChange={e => setZoneForm({ ...zoneForm, pos_fim: parseInt(e.target.value) || 1 })} /></div>
            </div>
            <div><Label className="text-xs">Descrição</Label><Input value={zoneForm.descricao} onChange={e => setZoneForm({ ...zoneForm, descricao: e.target.value })} placeholder="Ex: Classificação para a Champions" /></div>
            <Button size="sm" className="w-full" onClick={() => createZone.mutate(zoneForm)} disabled={!zoneForm.nome || createZone.isPending}>Salvar Zona</Button>
          </div>
        )}

        {leagueZones.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma zona configurada.</p>
        ) : (
          <div className="space-y-2">
            {leagueZones.map(z => (
              <div key={z.id} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: z.cor }} />
                  <div>
                    <p className="text-xs font-medium">{z.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{z.descricao} · Pos. {z.pos_inicio}–{z.pos_fim}</p>
                  </div>
                </div>
                {user?.role === 'admin' && (
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteZone.mutate(z.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}