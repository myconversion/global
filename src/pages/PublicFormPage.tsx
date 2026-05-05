import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CRMForm, FormField } from '@/types/crm-forms';

// Simple translations embedded (page is public, no I18n context)
const LABELS = {
  required: 'Este campo é obrigatório.',
  submit: 'Enviar',
  submitting: 'Enviando...',
  error: 'Erro ao enviar. Tente novamente.',
  notFound: 'Formulário não encontrado',
  notFoundDesc: 'Este formulário não existe, foi desativado ou o link está incorreto.',
};

// ---------------------------------------------------------------------------
// Field renderer
// ---------------------------------------------------------------------------
function FieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: FormField;
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string;
}) {
  const baseClass = cn(error && 'border-destructive focus-visible:ring-destructive');

  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          id={field.id}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          className={baseClass}
          rows={4}
        />
      );

    case 'select':
      return (
        <Select value={(value as string) ?? ''} onValueChange={onChange}>
          <SelectTrigger className={baseClass}>
            <SelectValue placeholder={field.placeholder || 'Selecionar...'} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={field.id}
            checked={(value as boolean) ?? false}
            onCheckedChange={checked => onChange(!!checked)}
          />
          <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
            {field.label}
          </Label>
        </div>
      );

    default:
      return (
        <Input
          id={field.id}
          type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={e => onChange(field.type === 'number' ? e.target.valueAsNumber : e.target.value)}
          className={baseClass}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// PublicFormPage
// ---------------------------------------------------------------------------
export default function PublicFormPage() {
  const { token } = useParams<{ token: string }>();

  const [form, setForm] = useState<Pick<CRMForm, 'id' | 'name' | 'description' | 'fields' | 'success_message' | 'redirect_url' | 'primary_entity' | 'is_active'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load form
  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }

    supabase
      .from('crm_forms')
      .select('id, name, description, fields, success_message, redirect_url, primary_entity, is_active')
      .eq('public_token', token)
      .eq('is_active', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setForm(data as typeof form);
        }
        setLoading(false);
      });
  }, [token]);

  const validate = (): boolean => {
    if (!form) return false;
    const errs: Record<string, string> = {};
    for (const field of form.fields) {
      if (field.required) {
        const v = values[field.id];
        if (v === undefined || v === null || v === '' || v === false) {
          errs[field.id] = LABELS.required;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !token) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-crm-form`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, data: values }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? LABELS.error);

      setSubmitted(true);
      if (json.redirect_url) {
        setTimeout(() => { window.location.href = json.redirect_url; }, 1500);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : LABELS.error);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-2xl font-bold">{LABELS.notFound}</h1>
          <p className="text-muted-foreground text-sm">{LABELS.notFoundDesc}</p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold">{form.success_message}</p>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-8 space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{form.name}</h1>
            {form.description && (
              <p className="text-sm text-muted-foreground">{form.description}</p>
            )}
          </div>

          {/* Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {form.fields.map(field => (
              <div key={field.id} className="space-y-1.5">
                {field.type !== 'checkbox' && (
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                )}
                <FieldInput
                  field={field}
                  value={values[field.id]}
                  onChange={val => setValues(prev => ({ ...prev, [field.id]: val }))}
                  error={errors[field.id]}
                />
                {errors[field.id] && (
                  <p className="text-destructive text-xs">{errors[field.id]}</p>
                )}
              </div>
            ))}

            {submitError && (
              <p className="text-destructive text-sm text-center">{submitError}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? LABELS.submitting : LABELS.submit}
            </Button>
          </form>
        </div>

        {/* Branding */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by <span className="font-semibold">conversion.</span>
        </p>
      </div>
    </div>
  );
}
