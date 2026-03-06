import { supabase } from '@/lib/supabase';

export type Folder = {
    id: string;
    name: string;
    parent_id: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
};

export const getFolders = async (parentId: string | null = null): Promise<Folder[]> => {
    let query = supabase
        .from('folders')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

    if (parentId) {
        query = query.eq('parent_id', parentId);
    } else {
        query = query.is('parent_id', null);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
};

export const getAllFolders = async (): Promise<Folder[]> => {
    const { data, error } = await supabase
        .from('folders')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
};

export const createFolder = async (folderData: { name: string; parent_id?: string | null }): Promise<Folder> => {
    // Pegar o usuario logado
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
        throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
        .from('folders')
        .insert([{
            name: folderData.name,
            parent_id: folderData.parent_id || null,
            user_id: userData.user.id
        }])
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

export const deleteFolder = async (folderId: string, deleteDocuments: boolean): Promise<void> => {
    // Se NO frontend o usuário desmarcou a exclusão dos arquivos, 
    // movemos esses arquivos para a raiz (folder_id = null).
    // Caso contrário, a RPC delete_folder já se encarrega de dar SOFT DELETE em todos.
    if (!deleteDocuments) {
        await supabase
            .from('documents')
            .update({ folder_id: null })
            .eq('folder_id', folderId)
            .is('deleted_at', null);
    }

    // Chama a RPC para excluir a pasta (e seus descendentes)
    const { error } = await supabase.rpc('delete_folder', {
        target_folder_id: folderId,
        delete_documents: deleteDocuments
    });

    if (error) {
        throw new Error(error.message);
    }
};

export const updateFolder = async (id: string, name: string): Promise<Folder> => {
    const { data, error } = await supabase
        .from('folders')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

export const moveDocument = async (documentId: string, folderId: string | null): Promise<void> => {
    const { error } = await supabase
        .from('documents')
        .update({ folder_id: folderId })
        .eq('id', documentId);

    if (error) {
        throw new Error(error.message);
    }
};

export const moveFolder = async (folderId: string, targetParentId: string | null): Promise<void> => {
    if (folderId === targetParentId) {
        throw new Error("Não é possível mover a pasta para dentro de si mesma.");
    }

    const { error } = await supabase
        .from('folders')
        .update({ parent_id: targetParentId })
        .eq('id', folderId);

    if (error) {
        throw new Error(error.message);
    }
};

// ==========================================
// LIXEIRA (TRASH) API
// ==========================================

export type TrashItem = {
    id: string;
    name: string;
    type: 'folder' | 'document';
    deleted_at: string;
    parent_id: string | null;
};

export const getTrashItems = async (): Promise<TrashItem[]> => {
    // Busca pastas deletadas
    const { data: trashFolders, error: foldersError } = await supabase
        .from('folders')
        .select('id, name, parent_id, deleted_at')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

    if (foldersError) throw new Error(foldersError.message);

    // Busca documentos deletados
    const { data: trashDocs, error: docsError } = await supabase
        .from('documents')
        .select('id, title, folder_id, deleted_at')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

    if (docsError) throw new Error(docsError.message);

    const items: TrashItem[] = [
        ...(trashFolders?.map(f => ({ ...f, type: 'folder' as const })) || []),
        ...(trashDocs?.map(d => ({
            id: d.id,
            name: d.title,
            deleted_at: d.deleted_at,
            parent_id: d.folder_id,
            type: 'document' as const
        })) || [])
    ];

    // Ordena pelo deleted_at decrescente
    return items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
};

export const restoreItemFromTrash = async (id: string, type: 'folder' | 'document'): Promise<void> => {
    const { error } = await supabase.rpc('restore_from_trash', {
        item_id: id,
        item_type: type
    });

    if (error) {
        throw new Error(error.message);
    }
};

export const permanentlyDeleteFromTrash = async (id: string, type: 'folder' | 'document'): Promise<void> => {
    const { error } = await supabase.rpc('permanently_delete_from_trash', {
        item_id: id,
        item_type: type
    });

    if (error) {
        throw new Error(error.message);
    }
};

export const emptyTrash = async (): Promise<void> => {
    const { error } = await supabase.rpc('empty_trash');

    if (error) {
        throw new Error(error.message);
    }
};
