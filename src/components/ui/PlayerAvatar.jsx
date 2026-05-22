import React from 'react';

export default function PlayerAvatar({ foto_url, nome, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-lg',
  };

  const initial = nome?.[0]?.toUpperCase() || '?';

  if (foto_url) {
    return (
      <img
        src={foto_url}
        alt={nome}
        className={`${sizeClasses[size]} rounded-full object-cover border border-border`}
        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground border border-border`}>
      {initial}
    </div>
  );
}