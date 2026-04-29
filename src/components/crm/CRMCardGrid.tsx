import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-orange-500',
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getAvatarColor(name: string) {
  return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
}

interface ContactCardProps {
  id: string;
  name: string;
  subtitle?: string | null;
  email?: string | null;
  phone?: string | null;
  statusLabel?: string;
  statusVariant?: 'default' | 'secondary';
  tempLabel?: string;
  tempClass?: string;
  tags?: string[];
  score?: number;
  extraInfo?: string;
  createdAt?: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ContactCard({
  id, name, subtitle, email, phone, statusLabel, statusVariant = 'secondary',
  tempLabel, tempClass, tags, score, extraInfo, createdAt, selected, onSelect, onView, onEdit, onDelete,
}: ContactCardProps) {
  const initial = name.charAt(0).toUpperCase();
  const avatarBg = getAvatarColor(name);

  return (
    <Card
      className={cn(
        'group hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer',
        selected && 'ring-2 ring-primary bg-primary/5'
      )}
      onClick={onView}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {onSelect && (
            <div className="pt-0.5 shrink-0" onClick={e => e.stopPropagation()}>
              <Checkbox
                checked={selected}
                onCheckedChange={() => onSelect(id)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          )}
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0', avatarBg)}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-foreground truncate">{name}</span>
              {statusLabel && (
                <Badge variant={statusVariant} className="text-[10px] px-1.5 py-0">{statusLabel}</Badge>
              )}
              {tempLabel && (
                <Badge className={cn('text-[10px] px-1.5 py-0', tempClass)}>{tempLabel}</Badge>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onView}><Eye className="w-3.5 h-3.5" /></Button>
            {onEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button>}
            {onDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>}
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 shrink-0" /><span>{phone}</span>
            </div>
          )}
        </div>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.slice(0, 3).map(t => (
              <span key={t} className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">{t}</span>
            ))}
            {tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>}
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Score: <strong className="text-foreground">{score ?? 0}</strong></span>
          {extraInfo && <span>{extraInfo}</span>}
          {createdAt && <span>{new Date(createdAt).toLocaleDateString('pt-BR')}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
