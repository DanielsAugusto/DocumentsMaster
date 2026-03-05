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

export const deleteFolder = async (id: string, deleteDocuments: boolean = false): Promise<void> => {
    const { error } = await supabase.rpc('delete_folder', {
        target_folder_id: id,
        delete_documents: deleteDocuments,
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
