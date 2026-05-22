import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Megaphone, Plus, Check, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const TIER_COLORS = {
  S: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
  A: 'bg-primary/10 text-primary border-primary/20',
  B: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  C: 'bg-secondary text-muted-foreground border-border',
  D: 'bg-destructive/10 text-destructive border-destructive/20',
};

const TIER_STARS = {
  S: { filled: 5, label: 'S' },
  A: { filled: 4, label: 'A' },
  B: { filled: 3, label: 'B' },
  C: { filled: 2, label: 'C' },
  D: { filled: 1, label: 'D' },
};

function Stars({ tier }) {
  const config = TIER_STARS[tier] || { filled: 0, label: '?' };
  return (
    <span className="text-[11px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < config.filled ? 'text-yellow-400' : 'text-muted-foreground/40'}>★</span>
      ))}
    </span>
  );
}

// Calculate tier from reputation
function getTierFromReputation(rep) {
  const r = rep || 0;
  if (r >= 90) return 'S';
  if (r >= 80) return 'A';
  if (r >= 65) return 'B';
  if (r >= 50) return 'C';
  return 'D';
}

const emptyForm = {
  nome: '', logo_url: '', valor_temporada: 0, valor_rodada: 0, bonus: 0,
  meta: '', clausula: '', contract_duration: '', tier: 'C', min_reputation: 0,
  accepted_financial_risk: 'muito_dinheiro_sobrando', accepted_sporting_risk: 'equipe_top', ativo: true,
};

export default function Sponsors() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showUnavailable, setShowUnavailable] = useState(false);

  const { data: sponsors = [] } = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => base44.entities.Sponsor.list(),
  });

  const { data: teamSponsors = [] } = useQuery({
    queryKey: ['teamSponsors'],
    queryFn: () => base44.entities.TeamSponsor.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  // The team controlled by the current user
  const userTeam = teams.find(t => t.player_email === user?.email || t.owner_email === user?.email);
  const userTeamTier = userTeam ? getTierFromReputation(userTeam.reputation) : null;

  // Active sponsors linked to user's team
  const mySponsors = teamSponsors.filter(ts => ts.team_id === userTeam?.id && ts.status !== 'encerrado');

  const saveSponsor = useMutation({
    mutationFn: (data) => editTarget
      ? base44.entities.Sponsor.update(editTarget.id, data)
      : base44.entities.Sponsor.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sponsors'] }); setDialogOpen(false); setEditTarget(null); },
  });

  const deleteSponsor = useMutation({
    mutationFn: (id) => base44.entities.Sponsor.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sponsors'] }),
  });

  const linkSponsor = useMutation({
    mutationFn: (sponsor) => base44.entities.TeamSponsor.create({
      team_id: userTeam.id,
      sponsor_id: sponsor.id,
      sponsor_nome: sponsor.nome,
      valor_temporada: sponsor.valor_temporada,
      valor_rodada: sponsor.valor_rodada,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamSponsors'] }),
  });

  const formatMoney = (v) => {
    if (!v) return '€0';
    if (v >= 1000000) return `€${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `€${(v / 1000).toFixed(0)}K`;
    return `€${v}`;
  };

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s) => { setEditTarget(s); setForm({ ...s }); setDialogOpen(true); };
  const handleDelete = (id) => { if (confirm('Excluir patrocinador?')) deleteSponsor.mutate(id); };

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const fNum = (field) => (e) => setForm(p => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const activeSponsors = sponsors.filter(s => s.ativo !== false);

  // Available: same tier as user's team
  const availableSponsors = userTeam
    ? activeSponsors.filter(s => s.tier === userTeamTier)
    : [];

  // Unavailable: different tier
  const unavailableSponsors = userTeam
    ? activeSponsors.filter(s => s.tier !== userTeamTier)
    : [];

  const reachedLimit = mySponsors.length >= 2;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Megaphone className="w-5 h-5 text-accent" /> Patrocinadores</h1>
        {user?.role === 'admin' && (
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Novo Patrocinador</Button>
        )}
      </div>

      {/* My active sponsors */}
      {userTeam && mySponsors.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Meus Patrocinadores ({mySponsors.length}/2)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mySponsors.map(ts => (
              <div key={ts.id} className="bg-card rounded-xl border border-primary/20 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold">{ts.sponsor_nome?.[0]}</div>
                  <div>
                    <p className="text-sm font-medium">{ts.sponsor_nome}</p>
                    <Badge className="text-[9px] bg-primary/10 text-primary">{ts.status}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded bg-secondary/50"><p className="text-[10px] text-muted-foreground">Temporada</p><p className="text-xs font-bold">{formatMoney(ts.valor_temporada)}</p></div>
                  <div className="p-2 rounded bg-secondary/50"><p className="text-[10px] text-muted-foreground">Por Rodada</p><p className="text-xs font-bold">{formatMoney(ts.valor_rodada)}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team tier info */}
      {userTeam && (
        <div className="flex items-center gap-3 bg-secondary/40 border border-border rounded-lg px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Seu clube:</span>
          <span className="text-sm font-semibold">{userTeam.nome}</span>
          <Badge variant="outline" className={`text-[10px] ${TIER_COLORS[userTeamTier]}`}><Stars tier={userTeamTier} /></Badge>
          <Stars tier={userTeamTier} />
          <span className="text-[10px] text-muted-foreground">(Reputação {userTeam.reputation || 0})</span>
        </div>
      )}

      {/* Available sponsors */}
      {userTeam && (
        <div>
          <h2 className="text-sm font-semibold mb-3 text-primary">
            Patrocinadores Disponíveis ({availableSponsors.length})
            {reachedLimit && <span className="ml-2 text-yellow-400 text-[11px] font-normal">⚠️ Limite de 2 patrocinadores atingido.</span>}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {availableSponsors.map(s => {
              const linked = mySponsors.some(ts => ts.sponsor_id === s.id);
              return (
                <SponsorCard
                  key={s.id}
                  sponsor={s}
                  linked={linked}
                  canLink={!linked && !reachedLimit}
                  onLink={() => linkSponsor.mutate(s)}
                  onEdit={() => openEdit(s)}
                  onDelete={() => handleDelete(s.id)}
                  isAdmin={user?.role === 'admin'}
                  formatMoney={formatMoney}
                />
              );
            })}
            {availableSponsors.length === 0 && (
              <p className="text-xs text-muted-foreground col-span-full py-4">
                Nenhum patrocinador disponível para o Nível {userTeamTier} do seu clube.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Unavailable sponsors (toggle) */}
      {userTeam && unavailableSponsors.length > 0 && (
        <div>
          <button
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3 hover:text-foreground transition-colors"
            onClick={() => setShowUnavailable(v => !v)}
          >
            {showUnavailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            Patrocínios Indisponíveis ({unavailableSponsors.length})
          </button>
          {showUnavailable && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {unavailableSponsors.map(s => (
                <SponsorCard
                  key={s.id}
                  sponsor={s}
                  unavailable
                  unavailableReason={`Indisponível para o nível atual do seu clube. Seu clube é Nível ${userTeamTier}`}
                  teamTier={userTeamTier}
                  onEdit={() => openEdit(s)}
                  onDelete={() => handleDelete(s.id)}
                  isAdmin={user?.role === 'admin'}
                  formatMoney={formatMoney}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin: all sponsors when no team */}
      {!userTeam && user?.role === 'admin' && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Todos os Patrocinadores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sponsors.map(s => (
              <SponsorCard
                key={s.id}
                sponsor={s}
                onEdit={() => openEdit(s)}
                onDelete={() => handleDelete(s.id)}
                isAdmin={true}
                formatMoney={formatMoney}
              />
            ))}
            {sponsors.length === 0 && <p className="text-xs text-muted-foreground text-center py-8 col-span-full">Nenhum patrocinador cadastrado</p>}
          </div>
        </div>
      )}

      {/* Admin-only: show all even when team exists */}
      {userTeam && user?.role === 'admin' && (
        <div>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground">Todos os Patrocinadores (Visão Admin)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sponsors.map(s => (
              <SponsorCard
                key={s.id}
                sponsor={s}
                onEdit={() => openEdit(s)}
                onDelete={() => handleDelete(s.id)}
                isAdmin={true}
                formatMoney={formatMoney}
                adminOnly
              />
            ))}
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); setEditTarget(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTarget ? 'Editar Patrocinador' : 'Novo Patrocinador'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome} onChange={f('nome')} /></div>
            <div className="col-span-2"><Label>Logo URL</Label><Input value={form.logo_url} onChange={f('logo_url')} placeholder="https://..." /></div>

            <div>
              <Label>Nível (Tier)</Label>
              <Select value={form.tier} onValueChange={v => setForm(p => ({ ...p, tier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['S','A','B','C','D'].map(t => (
                    <SelectItem key={t} value={t}>
                      Nível {t} {'★'.repeat(TIER_STARS[t].filled)}{'☆'.repeat(5 - TIER_STARS[t].filled)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Duração Contratual</Label><Input value={form.contract_duration} onChange={f('contract_duration')} placeholder="Ex: 1 temporada" /></div>

            <div><Label>Valor Temporada (€)</Label><Input type="number" value={form.valor_temporada} onChange={fNum('valor_temporada')} /></div>
            <div><Label>Valor por Rodada (€)</Label><Input type="number" value={form.valor_rodada} onChange={fNum('valor_rodada')} /></div>
            <div><Label>Bônus (€)</Label><Input type="number" value={form.bonus} onChange={fNum('bonus')} /></div>
            <div><Label>Reputação Mínima</Label><Input type="number" value={form.min_reputation} onChange={fNum('min_reputation')} /></div>

            <div className="col-span-2"><Label>Meta</Label><Input value={form.meta} onChange={f('meta')} /></div>
            <div className="col-span-2"><Label>Cláusula de Rescisão</Label><Input value={form.clausula} onChange={f('clausula')} /></div>
            <div className="col-span-2">
              <Button onClick={() => saveSponsor.mutate(form)} className="w-full" disabled={!form.nome}>
                {editTarget ? 'Salvar' : 'Criar Patrocinador'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SponsorCard({ sponsor, linked, canLink, unavailable, unavailableReason, teamTier, onLink, onEdit, onDelete, isAdmin, formatMoney, adminOnly }) {
  return (
    <div className={`bg-card rounded-xl border p-4 transition-all ${unavailable ? 'border-border opacity-55' : 'border-border hover:border-accent/30'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {sponsor.logo_url ? (
            <img src={sponsor.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-lg">{sponsor.nome?.[0]}</div>
          )}
          <div>
            <p className="text-sm font-medium">{sponsor.nome}</p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              {sponsor.tier && (
                <Badge variant="outline" className={`text-[9px] ${TIER_COLORS[sponsor.tier]}`}>
                  <Stars tier={sponsor.tier} />
                </Badge>
              )}
              {sponsor.contract_duration && (
                <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-400 border-green-500/20">{sponsor.contract_duration}</Badge>
              )}
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit}><Pencil className="w-3 h-3" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
          </div>
        )}
      </div>

      {sponsor.meta && (
        <p className="text-[10px] text-muted-foreground mb-2 italic">🎯 {sponsor.meta}</p>
      )}

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="p-2 rounded bg-secondary/50"><p className="text-[10px] text-muted-foreground">Temporada</p><p className="text-xs font-bold text-accent">{formatMoney(sponsor.valor_temporada)}</p></div>
        <div className="p-2 rounded bg-secondary/50"><p className="text-[10px] text-muted-foreground">Rodada</p><p className="text-xs font-bold">{formatMoney(sponsor.valor_rodada)}</p></div>
        <div className="p-2 rounded bg-secondary/50"><p className="text-[10px] text-muted-foreground">Bônus</p><p className="text-xs font-bold">{formatMoney(sponsor.bonus)}</p></div>
      </div>

      {sponsor.clausula && (
        <p className="text-[10px] text-muted-foreground mb-2">📋 Cláusula: {sponsor.clausula}</p>
      )}

      {unavailable && teamTier && (
        <div className="bg-secondary/60 rounded px-2 py-1.5 mb-2 text-[10px] text-muted-foreground">
          🔒 Indisponível · Seu clube: <Stars tier={teamTier} /> · Este patrocinador: <Stars tier={sponsor.tier} />
        </div>
      )}

      {!unavailable && onLink && (
        <Button
          size="sm"
          variant={linked ? 'secondary' : 'default'}
          className="w-full h-7 text-[10px]"
          disabled={linked || !canLink}
          onClick={onLink}
        >
          {linked ? <><Check className="w-3 h-3 mr-1" /> Vinculado</> : !canLink ? 'Limite atingido' : 'Escolher'}
        </Button>
      )}
    </div>
  );
}