import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const NATIONALITIES = [
  'Brasileira', 'Argentina', 'Uruguaia', 'Colombiana', 'Chilena', 'Peruana', 'Venezulana',
  'Boliviana', 'Paraguaia', 'Equatoriana', 'Portuguesa', 'Espanhola', 'Francesa', 'Alemã',
  'Italiana', 'Inglesa', 'Holandesa', 'Belga', 'Croata', 'Sérvio', 'Polaca', 'Suíça',
  'Africana', 'Nigeriana', 'Costa-Marfinense', 'Senegalesa', 'Marroquina', 'Egípcia',
];

const empty = {
  nome: '', descricao: '', temporada: '', categoria: 'liga_domestica', formato: 'pontos_corridos',
  pais: '', logo_url: '', emoji: '', max_times: 20, status: 'ativa', nacionalidade_base: '',
  // Pontos corridos
  tipo_turno: 'turno_e_returno',
  // Grupos
  num_grupos: 4, classificados_por_grupo: 2,
  // Mata-mata
  mata_mata_partidas: 'ida_e_volta', disputa_terceiro: false, final_jogo_unico: true,
  // Critérios de desempate (array ordenado)
  criterios_desempate: ['pontos', 'vitorias', 'saldo_gols', 'gols_pro'],
  // Regras adicionais
  regra_limite_orcamento_ativo: false, regra_limite_orcamento_pct: 70,
  regra_caixa_minimo_ativo: false, regra_caixa_minimo_valor: 5000000,
  regra_limite_elenco_ativo: false, regra_limite_elenco_qtd: 30,
  regra_limite_estrangeiros_ativo: false, regra_limite_estrangeiros_qtd: 7,
};

const CRITERIOS = [
  { value: 'vitorias', label: 'Vitórias' },
  { value: 'saldo_gols', label: 'Saldo de Gols' },
  { value: 'gols_pro', label: 'Gols Pró' },
  { value: 'gols_contra', label: 'Gols Sofridos' },
  { value: 'aproveitamento', label: 'Aproveitamento %' },
  { value: 'confronto_direto', label: 'Confronto Direto' },
  { value: 'menor_cartoes', label: 'Menor Nº de Cartões' },
  { value: 'sorteio', label: 'Sorteio' },
];

export default function CompetitionDialog({ open, onClose, editTarget, onSave, existingLeagues = [] }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (editTarget) {
      setForm({
        ...empty,
        nome: editTarget.nome || '',
        descricao: editTarget.descricao || '',
        temporada: editTarget.temporada || '',
        categoria: editTarget.categoria || 'liga_domestica',
        formato: editTarget.formato || 'pontos_corridos',
        pais: editTarget.pais || '',
        logo_url: editTarget.logo_url || '',
        emoji: editTarget.emoji || '',
        max_times: editTarget.max_times || 20,
        status: editTarget.status || 'ativa',
        nacionalidade_base: editTarget.nacionalidade_base || '',
        tipo_turno: editTarget.tipo_turno || 'turno_e_returno',
        num_grupos: editTarget.num_grupos || 4,
        classificados_por_grupo: editTarget.classificados_por_grupo || 2,
        mata_mata_partidas: editTarget.mata_mata_partidas || 'ida_e_volta',
        disputa_terceiro: editTarget.disputa_terceiro || false,
        final_jogo_unico: editTarget.final_jogo_unico !== undefined ? editTarget.final_jogo_unico : true,
        criterios_desempate: editTarget.criterios_desempate || ['pontos', 'vitorias', 'saldo_gols', 'gols_pro'],
        regra_limite_orcamento_ativo: editTarget.regra_limite_orcamento_ativo || false,
        regra_limite_orcamento_pct: editTarget.regra_limite_orcamento_pct || 70,
        regra_caixa_minimo_ativo: editTarget.regra_caixa_minimo_ativo || false,
        regra_caixa_minimo_valor: editTarget.regra_caixa_minimo_valor || 5000000,
        regra_limite_elenco_ativo: editTarget.regra_limite_elenco_ativo || false,
        regra_limite_elenco_qtd: editTarget.regra_limite_elenco_qtd || 30,
        regra_limite_estrangeiros_ativo: editTarget.regra_limite_estrangeiros_ativo || false,
        regra_limite_estrangeiros_qtd: editTarget.regra_limite_estrangeiros_qtd || 7,
      });
    } else {
      setForm(empty);
    }
  }, [editTarget, open]);

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const fNum = (field) => (e) => setForm(p => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));
  const fBool = (field) => (v) => setForm(p => ({ ...p, [field]: v }));

  const toggleCriterio = (crit) => {
    if (crit === 'pontos') return; // sempre primeiro, não removível
    setForm(p => {
      const curr = p.criterios_desempate.filter(c => c !== 'pontos');
      const already = curr.includes(crit);
      const updated = already ? curr.filter(c => c !== crit) : [...curr, crit];
      return { ...p, criterios_desempate: ['pontos', ...updated] };
    });
  };

  const isDomestic = form.categoria === 'liga_domestica' || form.categoria === 'copa_domestica';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTarget ? 'Editar Competição' : 'Nova Competição'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pr-1">
          {/* BÁSICO */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Informações Básicas</h3>
            <div><Label>Nome *</Label><Input value={form.nome} onChange={f('nome')} placeholder="Nome da competição" /></div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={f('descricao')} placeholder="Breve descrição da competição..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Temporada *</Label><Input value={form.temporada} onChange={f('temporada')} placeholder="2024/2025" /></div>
              <div><Label>Máx. Times</Label><Input type="number" min={2} value={form.max_times} onChange={fNum('max_times')} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liga_domestica">Liga Doméstica</SelectItem>
                    <SelectItem value="copa_domestica">Copa Doméstica</SelectItem>
                    <SelectItem value="internacional">Internacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Em andamento</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="encerrada">Encerrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>País / Continente</Label><Input value={form.pais} onChange={f('pais')} placeholder="Brasil, Europa..." /></div>
              <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={f('logo_url')} placeholder="https://..." /></div>
              <div><Label>Emoji (opcional)</Label><Input value={form.emoji || ''} onChange={f('emoji')} placeholder="🏆 🥇 ⚽" /></div>
            </div>

            {isDomestic && (
              <div>
                <Label>Nacionalidade Base</Label>
                <Select value={form.nacionalidade_base || 'none'} onValueChange={v => setForm(p => ({ ...p, nacionalidade_base: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a nacionalidade base" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não definido</SelectItem>
                    {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Usada para regra de estrangeiros</p>
              </div>
            )}
          </section>

          {/* FORMATO */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Formato</h3>
            <div>
              <Label>Formato da Competição</Label>
              <Select value={form.formato} onValueChange={v => setForm(p => ({ ...p, formato: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pontos_corridos">Pontos Corridos</SelectItem>
                  <SelectItem value="grupos_mata_mata">Fase de Grupos com Mata-Mata</SelectItem>
                  <SelectItem value="mata_mata">Mata-Mata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PONTOS CORRIDOS */}
            {form.formato === 'pontos_corridos' && (
              <div>
                <Label>Tipo de Turno</Label>
                <Select value={form.tipo_turno} onValueChange={v => setForm(p => ({ ...p, tipo_turno: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="turno_unico">Turno Único</SelectItem>
                    <SelectItem value="turno_e_returno">Turno e Returno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* GRUPOS + MATA-MATA */}
            {form.formato === 'grupos_mata_mata' && (
              <div className="space-y-3 bg-secondary/30 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground">Fase de Grupos</p>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Nº de Grupos</Label><Input type="number" min={1} value={form.num_grupos} onChange={fNum('num_grupos')} /></div>
                  <div><Label>Classificados/Grupo</Label><Input type="number" min={1} value={form.classificados_por_grupo} onChange={fNum('classificados_por_grupo')} /></div>
                  <div>
                    <Label>Turno</Label>
                    <Select value={form.tipo_turno} onValueChange={v => setForm(p => ({ ...p, tipo_turno: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="turno_unico">Turno Único</SelectItem>
                        <SelectItem value="turno_e_returno">Turno e Returno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground mt-2">Mata-Mata</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Partidas</Label>
                    <Select value={form.mata_mata_partidas} onValueChange={v => setForm(p => ({ ...p, mata_mata_partidas: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jogo_unico">Jogo Único</SelectItem>
                        <SelectItem value="ida_e_volta">Ida e Volta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <Switch checked={form.disputa_terceiro} onCheckedChange={fBool('disputa_terceiro')} />
                      <span className="text-xs">Disputa de 3º lugar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={form.final_jogo_unico} onCheckedChange={fBool('final_jogo_unico')} />
                      <span className="text-xs">Final em jogo único</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MATA-MATA PURO */}
            {form.formato === 'mata_mata' && (
              <div className="space-y-3 bg-secondary/30 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Partidas</Label>
                    <Select value={form.mata_mata_partidas} onValueChange={v => setForm(p => ({ ...p, mata_mata_partidas: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jogo_unico">Jogo Único</SelectItem>
                        <SelectItem value="ida_e_volta">Ida e Volta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <Switch checked={form.disputa_terceiro} onCheckedChange={fBool('disputa_terceiro')} />
                      <span className="text-xs">Disputa de 3º lugar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={form.final_jogo_unico} onCheckedChange={fBool('final_jogo_unico')} />
                      <span className="text-xs">Final em jogo único</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* CRITÉRIOS DE DESEMPATE */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Critérios de Desempate</h3>
            <p className="text-[10px] text-muted-foreground">Pontos é sempre o 1º critério. Selecione os demais:</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-primary/20 text-primary font-medium">1. Pontos</span>
              {CRITERIOS.map((c, i) => {
                const selected = form.criterios_desempate.includes(c.value);
                const idx = form.criterios_desempate.indexOf(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleCriterio(c.value)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${selected ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border'}`}
                  >
                    {selected ? `${idx}. ` : ''}{c.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* REGRAS ADICIONAIS */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Regras Adicionais</h3>

            <div className="space-y-3">
              {/* Limite de orçamento */}
              <div className="flex items-center justify-between bg-secondary/40 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Switch checked={form.regra_limite_orcamento_ativo} onCheckedChange={fBool('regra_limite_orcamento_ativo')} />
                  <div>
                    <p className="text-xs font-medium">Limite de Orçamento</p>
                    <p className="text-[10px] text-muted-foreground">Impacta Margem FPF</p>
                  </div>
                </div>
                {form.regra_limite_orcamento_ativo && (
                  <div className="flex items-center gap-1">
                    <Input type="number" min={1} max={100} value={form.regra_limite_orcamento_pct} onChange={fNum('regra_limite_orcamento_pct')} className="w-16 h-7 text-xs text-center" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                )}
              </div>

              {/* Caixa mínimo */}
              <div className="flex items-center justify-between bg-secondary/40 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Switch checked={form.regra_caixa_minimo_ativo} onCheckedChange={fBool('regra_caixa_minimo_ativo')} />
                  <div>
                    <p className="text-xs font-medium">Caixa Mínimo</p>
                    <p className="text-[10px] text-muted-foreground">Impacta Margem FPF</p>
                  </div>
                </div>
                {form.regra_caixa_minimo_ativo && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">€</span>
                    <Input type="number" min={0} value={form.regra_caixa_minimo_valor} onChange={fNum('regra_caixa_minimo_valor')} className="w-28 h-7 text-xs" />
                  </div>
                )}
              </div>

              {/* Limite de elenco */}
              <div className="flex items-center justify-between bg-secondary/40 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Switch checked={form.regra_limite_elenco_ativo} onCheckedChange={fBool('regra_limite_elenco_ativo')} />
                  <div>
                    <p className="text-xs font-medium">Limite de Elenco</p>
                    <p className="text-[10px] text-muted-foreground">Gera alerta se descumprido</p>
                  </div>
                </div>
                {form.regra_limite_elenco_ativo && (
                  <div className="flex items-center gap-1">
                    <Input type="number" min={1} value={form.regra_limite_elenco_qtd} onChange={fNum('regra_limite_elenco_qtd')} className="w-16 h-7 text-xs text-center" />
                    <span className="text-xs text-muted-foreground">jog.</span>
                  </div>
                )}
              </div>

              {/* Limite de estrangeiros */}
              <div className="flex items-center justify-between bg-secondary/40 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Switch checked={form.regra_limite_estrangeiros_ativo} onCheckedChange={fBool('regra_limite_estrangeiros_ativo')} />
                  <div>
                    <p className="text-xs font-medium">Limite de Estrangeiros</p>
                    <p className="text-[10px] text-muted-foreground">Gera alerta se descumprido</p>
                  </div>
                </div>
                {form.regra_limite_estrangeiros_ativo && (
                  <div className="flex items-center gap-1">
                    <Input type="number" min={0} value={form.regra_limite_estrangeiros_qtd} onChange={fNum('regra_limite_estrangeiros_qtd')} className="w-16 h-7 text-xs text-center" />
                    <span className="text-xs text-muted-foreground">estrang.</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <Button onClick={() => {
            // Auto-generate league_id for new competitions
            if (!editTarget) {
              const existingIds = existingLeagues
                .map(l => l.league_id)
                .filter(lid => lid && /^C\d+$/.test(lid))
                .map(lid => parseInt(lid.replace('C', '')));
              const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
              if (maxId >= 1000) { alert('Limite de 1000 competições atingido (C1000). Contate o administrador.'); return; }
              onSave({ ...form, league_id: `C${maxId + 1}` });
            } else {
              onSave(form);
            }
          }} className="w-full" disabled={!form.nome || !form.temporada}>
            {editTarget ? 'Salvar' : 'Criar Competição'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}