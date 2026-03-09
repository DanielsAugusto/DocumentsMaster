-- 1. Add deleted_at to folders and documents
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Add trash_retention_days to user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS trash_retention_days INT DEFAULT 30;

-- 3. Modify delete_folder function for soft delete
CREATE OR REPLACE FUNCTION public.delete_folder(target_folder_id UUID, delete_documents BOOLEAN DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_children_count INT;
    v_doc_count INT;
BEGIN
    -- Verify ownership
    SELECT user_id INTO v_user_id FROM public.folders WHERE id = target_folder_id;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Folder not found';
    END IF;

    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Count children (active and inactive, or just active)
    SELECT count(*) INTO v_children_count FROM public.folders WHERE parent_id = target_folder_id AND deleted_at IS NULL;
    SELECT count(*) INTO v_doc_count FROM public.documents WHERE folder_id = target_folder_id AND deleted_at IS NULL;

    IF v_children_count = 0 AND v_doc_count = 0 THEN
        -- Hard delete if completely empty
        DELETE FROM public.folders WHERE id = target_folder_id;
    ELSE
        -- Soft delete if it has contents
        -- Update the folder itself
        UPDATE public.folders SET deleted_at = NOW() WHERE id = target_folder_id;
        
        -- Soft delete all descendant folders recursively
        WITH RECURSIVE folder_tree AS (
            SELECT id FROM public.folders WHERE parent_id = target_folder_id
            UNION
            SELECT f.id FROM public.folders f
            INNER JOIN folder_tree ft ON ft.id = f.parent_id
        )
        UPDATE public.folders SET deleted_at = NOW() 
        WHERE id IN (SELECT id FROM folder_tree) AND deleted_at IS NULL;

        -- Soft delete all documents in this folder and its descendants
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

-- 4. Create restore_from_trash function
CREATE OR REPLACE FUNCTION public.restore_from_trash(item_id UUID, item_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_organization_id UUID;
    v_restaurados_folder_id UUID;
BEGIN
    -- Get user_id and organization_id based on item type
    IF item_type = 'folder' THEN
        SELECT user_id, organization_id INTO v_user_id, v_organization_id FROM public.folders WHERE id = item_id;
    ELSIF item_type = 'document' THEN
        SELECT user_id, organization_id INTO v_user_id, v_organization_id FROM public.documents WHERE id = item_id;
    ELSE
        RAISE EXCEPTION 'Invalid item type';
    END IF;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Find existing "Restaurados" folder
    SELECT id INTO v_restaurados_folder_id 
    FROM public.folders 
    WHERE user_id = v_user_id 
      AND organization_id = v_organization_id
      AND name = 'Restaurados' 
      AND parent_id IS NULL 
      AND deleted_at IS NULL
    LIMIT 1;

    -- Create only if it doesn't exist (ON CONFLICT prevents duplicates)
    IF v_restaurados_folder_id IS NULL THEN
        INSERT INTO public.folders (name, user_id, parent_id, organization_id)
        VALUES ('Restaurados', v_user_id, NULL, v_organization_id)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_restaurados_folder_id;

        -- If ON CONFLICT hit, fetch the existing one
        IF v_restaurados_folder_id IS NULL THEN
            SELECT id INTO v_restaurados_folder_id 
            FROM public.folders 
            WHERE user_id = v_user_id 
              AND organization_id = v_organization_id
              AND name = 'Restaurados' 
              AND parent_id IS NULL 
              AND deleted_at IS NULL
            LIMIT 1;
        END IF;
    END IF;

    -- Restore the item and move it to "Restaurados"
    IF item_type = 'folder' THEN
        UPDATE public.folders 
        SET deleted_at = NULL, parent_id = v_restaurados_folder_id 
        WHERE id = item_id;
        
        -- Restore children recursively
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

-- 5. Empty trash explicitly
CREATE OR REPLACE FUNCTION public.empty_trash()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.documents WHERE user_id = auth.uid() AND deleted_at IS NOT NULL;
    DELETE FROM public.folders WHERE user_id = auth.uid() AND deleted_at IS NOT NULL;
END;
$$;

-- 6. Permanently delete specific item
CREATE OR REPLACE FUNCTION public.permanently_delete_from_trash(item_id UUID, item_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF item_type = 'folder' THEN
        SELECT user_id INTO v_user_id FROM public.folders WHERE id = item_id;
        IF v_user_id = auth.uid() THEN
            DELETE FROM public.folders WHERE id = item_id;
        END IF;
    ELSIF item_type = 'document' THEN
        SELECT user_id INTO v_user_id FROM public.documents WHERE id = item_id;
        IF v_user_id = auth.uid() THEN
            DELETE FROM public.documents WHERE id = item_id;
        END IF;
    END IF;
END;
$$;
