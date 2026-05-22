import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Inbox as InboxIcon, Check, Bell, ArrowLeftRight, Calendar, AlertTriangle, Megaphone, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const iconMap = {
  transferencia: ArrowLeftRight,
  contraproposta: ArrowLeftRight,
  jogo: Calendar,
  punicao: AlertTriangle,
  patrocinador: Megaphone,
  alerta_financeiro: DollarSign,
  sistema: Bell,
};

const colorMap = {
  transferencia: 'text-primary',
  contraproposta: 'text-accent',
  jogo: 'text-chart-3',
  punicao: 'text-destructive',
  patrocinador: 'text-accent',
  alerta_financeiro: 'text-accent',
  sistema: 'text-muted-foreground',
};

export default function Inbox() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('all');

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ destinatario_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { lida: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.lida);
      for (const n of unread) {
        await base44.entities.Notification.update(n.id, { lida: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] }),
  });

  const filtered = tab === 'all' ? notifications : notifications.filter(n => n.tipo === tab);
  const unreadCount = notifications.filter(n => !n.lida).length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <InboxIcon className="w-5 h-5 text-chart-3" /> Caixa de Entrada
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{unreadCount} não lida{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()}>
            <Check className="w-4 h-4 mr-1" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary flex-wrap">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="transferencia">Transferências</TabsTrigger>
          <TabsTrigger value="contraproposta">Contrapropostas</TabsTrigger>
          <TabsTrigger value="jogo">Jogos</TabsTrigger>
          <TabsTrigger value="punicao">Punições</TabsTrigger>
          <TabsTrigger value="patrocinador">Patrocínios</TabsTrigger>
          <TabsTrigger value="alerta_financeiro">Finanças</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="space-y-2">
            {filtered.map(n => {
              const Icon = iconMap[n.tipo] || Bell;
              const color = colorMap[n.tipo] || 'text-muted-foreground';
              return (
                <div key={n.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${n.lida ? 'bg-card border-border' : 'bg-card border-primary/20 hover:bg-secondary/40'}`}
                  onClick={() => !n.lida && markRead.mutate(n.id)}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${n.lida ? 'bg-secondary' : 'bg-primary/10'}`}>
                    <Icon className={`w-4 h-4 ${n.lida ? 'text-muted-foreground' : color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${n.lida ? 'text-muted-foreground' : 'text-foreground'}`}>{n.titulo}</p>
                      {!n.lida && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_date).toLocaleString('pt-BR')}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] flex-shrink-0">{n.tipo?.replace('_', ' ')}</Badge>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">Nenhuma notificação</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}