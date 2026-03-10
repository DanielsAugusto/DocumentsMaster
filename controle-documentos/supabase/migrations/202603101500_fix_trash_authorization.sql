-- Migration: Fix Trash Authorization
-- This migration updates trash-related functions to allow operations by any member of the same organization.

-- 1. Update delete_folder function
CREATE OR REPLACE FUNCTION public.delete_folder(target_folder_id UUID, delete_documents BOOLEAN DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_children_count INT;
    v_doc_count INT;
BEGIN
    -- Verify organization membership
    SELECT organization_id INTO v_org_id FROM public.folders WHERE id = target_folder_id;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Folder not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE organization_id = v_org_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Count children
    SELECT count(*) INTO v_children_count FROM public.folders WHERE parent_id = target_folder_id AND deleted_at IS NULL;
    SELECT count(*) INTO v_doc_count FROM public.documents WHERE folder_id = target_folder_id AND deleted_at IS NULL;

    IF v_children_count = 0 AND v_doc_count = 0 THEN
        DELETE FROM public.folders WHERE id = target_folder_id;
    ELSE
        UPDATE public.folders SET deleted_at = NOW() WHERE id = target_folder_id;
        
        WITH RECURSIVE folder_tree AS (
            SELECT id FROM public.folders WHERE parent_id = target_folder_id
            UNION
            SELECT f.id FROM public.folders f
            INNER JOIN folder_tree ft ON ft.id = f.parent_id
        )
        UPDATE public.folders SET deleted_at = NOW() 
        WHERE id IN (SELECT id FROM folder_tree) AND deleted_at IS NULL;

        WITH RECURSIVE folder_tree AS (
            SELECT id FROM public.folders WHERE id = target_folder_id
            UNION
            SELECT f.id FROM public.folders f
            INNER JOIN folder_tree ft ON ft.id = f.parent_id
        )
        UPDATE public.documents SET deleted_at = NOW() 
        WHERE folder_id IN (SELECT id FROM folder_tree) AND deleted_at IS NULL;
    END IF;
END;
$$;

-- 2. Update restore_from_trash function
CREATE OR REPLACE FUNCTION public.restore_from_trash(item_id UUID, item_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_restaurados_folder_id UUID;
    v_current_user_id UUID := auth.uid();
BEGIN
    -- Get organization_id based on item type
    IF item_type = 'folder' THEN
        SELECT organization_id INTO v_organization_id FROM public.folders WHERE id = item_id;
    ELSIF item_type = 'document' THEN
        SELECT organization_id INTO v_organization_id FROM public.documents WHERE id = item_id;
    ELSE
        RAISE EXCEPTION 'Invalid item type';
    END IF;

    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    -- Verify membership
    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE organization_id = v_organization_id AND user_id = v_current_user_id
    ) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Find or create "Restaurados" folder for the CURRENT user
    SELECT id INTO v_restaurados_folder_id 
    FROM public.folders 
    WHERE user_id = v_current_user_id 
      AND organization_id = v_organization_id
      AND name = 'Restaurados' 
      AND parent_id IS NULL 
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_restaurados_folder_id IS NULL THEN
        INSERT INTO public.folders (name, user_id, parent_id, organization_id)
        VALUES ('Restaurados', v_current_user_id, NULL, v_organization_id)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_restaurados_folder_id;

        IF v_restaurados_folder_id IS NULL THEN
            SELECT id INTO v_restaurados_folder_id 
            FROM public.folders 
            WHERE user_id = v_current_user_id 
              AND organization_id = v_organization_id
              AND name = 'Restaurados' 
              AND parent_id IS NULL 
              AND deleted_at IS NULL
            LIMIT 1;
        END IF;
    END IF;

    -- Restore the item
    IF item_type = 'folder' THEN
        UPDATE public.folders 
        SET deleted_at = NULL, parent_id = v_restaurados_folder_id 
        WHERE id = item_id;
        
        WITH RECURSIVE folder_tree AS (
            SELECT id FROM public.folders WHERE parent_id = item_id
            UNION
            SELECT f.id FROM public.folders f
            INNER JOIN folder_tree ft ON ft.id = f.parent_id
        )
        UPDATE public.folders SET deleted_at = NULL 
        WHERE id IN (SELECT id FROM folder_tree);

        WITH RECURSIVE folder_tree AS (
            SELECT id FROM public.folders WHERE id = item_id
            UNION
            SELECT f.id FROM public.folders f
            INNER JOIN folder_tree ft ON ft.id = f.parent_id
        )
        UPDATE public.documents SET deleted_at = NULL 
        WHERE folder_id IN (SELECT id FROM folder_tree);

    ELSIF item_type = 'document' THEN
        UPDATE public.documents 
        SET deleted_at = NULL, folder_id = v_restaurados_folder_id 
        WHERE id = item_id;
    END IF;
END;
$$;

-- 3. Update permanently_delete_from_trash function
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
            DELETE FROM public.folders WHERE id = item_id;
        ELSIF item_type = 'document' THEN
            DELETE FROM public.documents WHERE id = item_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'Not authorized';
    END IF;
END;
$$;
