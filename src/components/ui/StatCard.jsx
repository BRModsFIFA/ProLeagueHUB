import React from 'react';

export default function StatCard({ label, value, icon: Icon, variant = 'default', subtitle }) {
  const variants = {
    default: 'border-border',
    green: 'border-primary/30',
    gold: 'border-accent/30',
    red: 'border-destructive/30',
    blue: 'border-chart-3/30'
  };

  const iconVariants = {
    default: 'bg-secondary text-muted-foreground',
    green: 'bg-primary/10 text-primary',
    gold: 'bg-accent/10 text-accent',
    red: 'bg-destructive/10 text-destructive',
    blue: 'bg-chart-3/10 text-chart-3'
  };

  return (
    <div className={`bg-card rounded-xl border ${variants[variant]} p-4 transition-all hover:bg-card/80`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-[#22c35d]">{value}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon &&
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconVariants[variant]}`}>
            <Icon className="w-4 h-4" />
          </div>
        }
      </div>
    </div>);

}