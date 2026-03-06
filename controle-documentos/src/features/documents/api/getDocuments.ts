import { supabase } from '@/lib/supabase';

export type Document = {
    id: string;
    title: string;
    entity_name?: string;
    subject?: string;
    document_date?: string;
    keywords?: string;
    sender?: string;
    recipient?: string;
    type: string;
    drive_url: string;
    created_at: string;
    folder_id?: string | null;
};

export const getDocuments = async (folderId: string | null | 'all' = null): Promise<Document[]> => {
    let query = supabase
        .from('documents')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (folderId !== 'all') {
        if (folderId) {
            query = query.eq('folder_id', folderId);
        } else {
            query = query.is('folder_id', null);
        }
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
};
