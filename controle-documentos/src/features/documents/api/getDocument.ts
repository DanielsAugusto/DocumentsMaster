import { supabase } from '@/lib/supabase';
import { Document } from './getDocuments';

export const getDocument = async (id: string): Promise<Document> => {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};
