-- Migration: Automatic Trash Cleanup via pg_cron
-- Creates the clean_expired_trash function and schedules it daily.

-- Habilita a extensão pg_cron (caso não esteja ativa)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criação da função de limpeza
CREATE OR REPLACE FUNCTION public.clean_expired_trash()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count int;
BEGIN
    -- Deleta todos os documentos expirados cruzando com as configurações do usuário logado
    DELETE FROM public.documents d
    USING public.user_settings s
    WHERE d.user_id = s.user_id
      AND d.deleted_at IS NOT NULL
      AND d.deleted_at < NOW() - (s.trash_retention_days * interval '1 day');

    -- Deleta todas as pastas expiradas abordando de baixo para cima (bottom-up)
    -- Isso evita erros de Foreign Key quando uma pasta possui subpastas que também expiraram
    LOOP
        DELETE FROM public.folders f
        USING public.user_settings s
        WHERE f.user_id = s.user_id
          AND f.deleted_at IS NOT NULL
          AND f.deleted_at < NOW() - (s.trash_retention_days * interval '1 day')
          AND NOT EXISTS (
              SELECT 1 FROM public.folders child 
              WHERE child.parent_id = f.id
          );
          
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        EXIT WHEN deleted_count = 0;
    END LOOP;
END;
$$;

-- Desagenda antes caso a migration seja rodada novamente
DO $$
BEGIN
    PERFORM cron.unschedule('clean-trash');
EXCEPTION
    WHEN OTHERS THEN
        -- ignora erro se não existir
END;
$$;

-- Agenda a rotina para rodar todos os dias à meia-noite (00:00)
SELECT cron.schedule('clean-trash', '0 0 * * *', 'SELECT public.clean_expired_trash()');
