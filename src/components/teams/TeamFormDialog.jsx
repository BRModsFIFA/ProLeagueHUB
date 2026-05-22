import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PlayerAvatar from '@/components/ui/PlayerAvatar';

const empty = {
  nome: '', escudo_url: '', orcamento: 0, reputation: 50,
  registration_fee_brl: 0, league_id: '',
  owner_user_id: '', owner_name: '', owner_email: '', owner_display_name: '', player_email: '',
};

export default function TeamFormDialog({ open, onClose, editTarget, onSave, leagues = [] }) {
  const [form, setForm] = useState(empty);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  useEffect(() => {
    if (editTarget) {
      setForm({
        nome: editTarget.nome || '',
        escudo_url: editTarget.escudo_url || '',
        orcamento: editTarget.orcamento || 0,
        reputation: editTarget.reputation ?? 50,
        registration_fee_brl: editTarget.registration_fee_brl || 0,
        league_id: editTarget.league_id || '',
        owner_user_id: editTarget.owner_user_id || '',
        owner_name: editTarget.owner_name || '',
        owner_email: editTarget.owner_email || editTarget.player_email || '',
        owner_display_name: editTarget.owner_display_name || '',
        player_email: editTarget.player_email || editTarget.owner_email || '',
      });
    } else {
      setForm(empty);
    }
  }, [editTarget, open]);

  const selectOwner = (userId) => {
    if (userId === 'none') {
      setForm(p => ({ ...p, owner_user_id: '', owner_name: '', owner_email: '', owner_display_name: '', player_email: '' }));
      return;
    }
    const u = users.find(u => u.id === userId);
    if (u) {
      setForm(p => ({
        ...p,
        owner_user_id: u.id,
        owner_name: u.full_name || '',
        owner_email: u.email || '',
        owner_display_name: u.full_name || u.email || '',
        player_email: u.email || '',
      }));
    }
  };

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const fNum = (field) => (e) => setForm(p => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const currentOwnerId = form.owner_user_id || 'none';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTarget ? 'Editar Time' : 'Novo Time'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome do Time *</Label>
            <Input value={form.nome} onChange={f('nome')} placeholder="Ex: FC Barcelona" />
          </div>

          <div>
            <Label>Liga / Competição Principal</Label>
            <Select value={form.league_id || 'none'} onValueChange={v => setForm(p => ({ ...p, league_id: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Sem liga" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem liga</SelectItem>
                {leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>URL do Escudo</Label>
            <Input value={form.escudo_url} onChange={f('escudo_url')} placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Orçamento (€)</Label>
              <Input type="number" min={0} value={form.orcamento} onChange={fNum('orcamento')} />
            </div>
            <div>
              <Label>Reputação (0–100)</Label>
              <Input type="number" min={0} max={100} value={form.reputation} onChange={fNum('reputation')} />
            </div>
          </div>

          <div>
            <Label>Taxa de Inscrição do Time (R$)</Label>
            <Input type="number" min={0} value={form.registration_fee_brl} onChange={fNum('registration_fee_brl')} />
          </div>

          <div>
            <Label>Dono / Gestor do Time</Label>
            <Select value={currentOwnerId} onValueChange={selectOwner}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o dono" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem dono</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex items-center gap-2">
                      <span>{u.full_name || u.email}</span>
                      {u.full_name && <span className="text-muted-foreground text-[10px]">({u.email})</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.owner_name && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Vinculado: {form.owner_name} · {form.owner_email}
              </p>
            )}
          </div>

          <Button onClick={() => onSave(form)} className="w-full" disabled={!form.nome}>
            {editTarget ? 'Salvar' : 'Criar Time'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
