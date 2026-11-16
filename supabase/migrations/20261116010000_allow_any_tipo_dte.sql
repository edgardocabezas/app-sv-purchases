-- Allow persisting any DTE tipo (known 01/03/05/06/07 and unexpected tipos).
-- Exportables for CSV remain 03/05/06; others are informative / control Excel only.

alter table public.dte_documents
  drop constraint if exists dte_documents_tipo_dte_check;

alter table public.dte_documents
  add constraint dte_documents_tipo_dte_check
  check (tipo_dte ~ '^[0-9A-Za-z]{1,4}$');
