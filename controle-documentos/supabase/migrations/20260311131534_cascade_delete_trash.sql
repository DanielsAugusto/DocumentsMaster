-- Migration: Cascade delete trash folders
-- This migration updates `permanently_delete_from_trash` to recursively delete subfolders and documents

CREATE OR REPLACE FUNCTION public.permanently_delete_from_trash(item_id UUID, item_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    IF item_type = 'folder' THEN
        SELECT organization_id INTO v_org_id FROM public.folders WHERE id = item_id;
    ELSIF item_type = 'document' THEN
        SELECT organization_id INTO v_org_id FROM public.documents WHERE id = item_id;
    END IF;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE organization_id = v_org_id AND user_id = auth.uid()
    ) THEN
        IF item_type = 'folder' THEN
            -- Primeiro deleta todos os documentos nas pastas descendentes e na pasta alvo
            WITH RECURSIVE folder_tree AS (
                SELECT id FROM public.folders WHERE id = item_id
                UNION
                SELECT f.id FROM public.folders f
                INNER JOIN folder_tree ft ON ft.id = f.parent_id
            )
            DELETE FROM public.documents WHERE folder_id IN (SELECT id FROM folder_tree);

            -- Depois deleta as pastas descendentes e a pasta alvo
            WITH RECURSIVE folder_tree AS (
                SELECT id FROM public.folders WHERE id = item_id
                UNION
                SELECT f.id FROM public.folders f
                INNER JOIN folder_tree ft ON ft.id = f.parent_id
            )
            DELETE FROM public.folders WHERE id IN (SELECT id FROM folder_tree);
            
        ELSIF item_type = 'document' THEN
            DELETE FROM public.documents WHERE id = item_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'Not authorized';
    END IF;
END;
$$;
