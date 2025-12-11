-- ==========================================
-- SCRIPT COMPLETO DE PERMISSÕES (ADMIN)
-- Rode isso no SQL Editor do Supabase para destravar tudo.
-- ==========================================

-- 1. LICENSES (Gerar chaves manuais, Pausar, Excluir)
alter table licenses enable row level security;

create policy "Admin Access Licenses"
on licenses for all
to authenticated
using ( true )
with check ( true );

-- 2. WEBHOOK LOGS (Ver logs, Limpar logs)
alter table webhook_logs enable row level security;

create policy "Admin Access Logs"
on webhook_logs for all
to authenticated
using ( true )
with check ( true );

-- Permitir que a API (se rodar como Anon) ou Simulador insira logs
create policy "Public Insert Logs"
on webhook_logs for insert
to anon
with check ( true );


-- 3. APP VERSIONS (Upload e Listagem)
alter table app_versions enable row level security;

create policy "Admin Access Versions"
on app_versions for all
to authenticated
using ( true )
with check ( true );


-- 4. STORAGE (Upload de Arquivos .exe/.rar)
-- Primeiro, tenta criar o bucket se não existir (opcional, as vezes falha se ja existe, ignora erro)
insert into storage.buckets (id, name, public) 
values ('installers', 'installers', true)
on conflict (id) do nothing;

create policy "Admin Insert Storage"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'installers' );

create policy "Public Download Storage"
on storage.objects for select
to public
using ( bucket_id = 'installers' );

create policy "Admin Delete Storage"
on storage.objects for delete
to authenticated
using ( bucket_id = 'installers' );
