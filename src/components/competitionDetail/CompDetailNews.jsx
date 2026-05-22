import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Newspaper, Plus, X } from 'lucide-react';

const TYPE_LABELS = {
  inscricao: 'Inscrição',
  jogo: 'Jogo',
  punicao: 'Punição',
  transferencia: 'Transferência',
  campeonato: 'Campeonato',
  geral: 'Geral',
};
const TYPE_COLORS = {
  inscricao: 'bg-primary/10 text-primary',
  jogo: 'bg-chart-3/10 text-chart-3',
  punicao: 'bg-destructive/10 text-destructive',
  transferencia: 'bg-accent/10 text-accent',
  campeonato: 'bg-yellow-500/10 text-yellow-400',
  geral: 'bg-secondary text-muted-foreground',
};

export default function CompDetailNews({ leagueNews, league, user, queryClient }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'geral' });

  const createNews = useMutation({
    mutationFn: (data) => base44.entities.CompetitionNews.create({ ...data, competition_id: league.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['compNews'] }); setShowForm(false); setForm({ title: '', content: '', type: 'geral' }); },
  });

  return (
    <div className="space-y-4">
      {user?.role === 'admin' && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {showForm ? 'Cancelar' : 'Nova Notícia'}
          </Button>
        </div>
      )}

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Conteúdo</Label><textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="w-full bg-secondary rounded-lg p-2 text-sm border border-border min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring" /></div>
          <div>
            <Label>Tipo</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.keys(TYPE_LABELS).map(t => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${form.type === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => createNews.mutate(form)} disabled={!form.title || !form.content || createNews.isPending} className="w-full">Publicar</Button>
        </div>
      )}

      {leagueNews.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Newspaper className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma notícia ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leagueNews.map(n => (
            <div key={n.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold">{n.title}</h3>
                <Badge variant="outline" className={`text-[9px] flex-shrink-0 ${TYPE_COLORS[n.type] || ''}`}>{TYPE_LABELS[n.type] || n.type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{n.content}</p>
              <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_date).toLocaleDateString('pt-BR')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}