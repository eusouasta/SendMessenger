-- 1. Fix Storage Permissions (Allow Admin to Upload)
-- Permitir INSERT (Upload) no bucket 'installers' para usuários logados
create policy "Admin Insert Installers"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'installers' );

-- Permitir SELECT (Download) para todos (ou autenticados)
create policy "Public Select Installers"
on storage.objects for select
to public
using ( bucket_id = 'installers' );

-- Permitir DELETE (Excluir versão)
create policy "Admin Delete Installers"
on storage.objects for delete
to authenticated
using ( bucket_id = 'installers' );


-- 2. Fix Database Table Permissions (app_versions)
-- Enable RLS (Good practice, but ensure we have policies)
alter table app_versions enable row level security;

-- Permitir tudo para o Admin (Authenticated)
create policy "Admin All Access App Versions"
on app_versions
for all
to authenticated
using ( true )
with check ( true );
