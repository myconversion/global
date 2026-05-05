export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'select'
  | 'number'
  | 'checkbox';

export type FieldMapping =
  | 'contact.name'
  | 'contact.email'
  | 'contact.phone'
  | 'contact.cpf'
  | 'contact.position'
  | 'company.razao_social'
  | 'company.nome_fantasia'
  | 'company.cnpj'
  | 'company.email'
  | 'company.phone'
  | 'deal.title'
  | 'deal.value'
  | 'custom_field';

export interface FormField {
  /** UUID gerado no client — usado como React key e draggable id */
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  mapping: FieldMapping;
  /** Opções para campos do tipo 'select' */
  options?: string[];
  /** Chave JSONB para mapping='custom_field' */
  customFieldKey?: string;
}

export interface CRMForm {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  pipeline_id: string | null;
  primary_entity: 'contact' | 'company';
  fields: FormField[];
  success_message: string;
  redirect_url: string | null;
  public_token: string;
  is_active: boolean;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMFormWithCount extends CRMForm {
  crm_form_submissions: { count: number }[];
}

export interface CRMFormSubmission {
  id: string;
  form_id: string;
  company_id: string;
  data: Record<string, unknown>;
  contact_id: string | null;
  crm_company_id: string | null;
  deal_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  submitted_at: string;
}

/** Payload enviado para a Edge Function submit-crm-form */
export interface SubmitFormPayload {
  token: string;
  data: Record<string, unknown>;
}
