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
};

export const getDocuments = async (): Promise<Document[]> => {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
};
