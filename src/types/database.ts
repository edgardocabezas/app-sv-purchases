export type WorkspaceRole = "owner" | "admin" | "member";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface Company {
  id: string;
  workspace_id: string;
  name: string;
  nit: string | null;
  nrc: string | null;
  created_at: string;
  updated_at: string;
}

export interface DteDocument {
  id: string;
  company_id: string;
  /** Any DTE tipo string (01/03/05/06/07 or unexpected). */
  tipo_dte: string;
  codigo_generacion: string;
  fec_emi: string;
  emisor_nit: string | null;
  emisor_nrc: string | null;
  emisor_nombre: string | null;
  total_gravada: number;
  iva: number;
  fovial: number;
  cotrans: number;
  total_con_iva: number;
  exento: number;
  raw_json: Record<string, unknown>;
  source_filename: string | null;
  tipo_operacion: string | null;
  clasificacion: string | null;
  sector: string | null;
  tipo_costo_gasto: string | null;
  period_year: number | null;
  period_month: number | null;
  exported_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DteDocumentInsert = Omit<
  DteDocument,
  "id" | "created_at" | "updated_at" | "exported_at"
> & {
  id?: string;
  exported_at?: string | null;
};
