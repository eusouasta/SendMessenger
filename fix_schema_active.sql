-- Adiciona a coluna 'active' se ela não existir
ALTER TABLE app_versions 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Força uma atualização do cache do schema (às vezes necessário)
NOTIFY pgrst, 'reload config';
