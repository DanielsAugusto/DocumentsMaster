import { supabase } from '@/lib/supabase';

export const createDocument = async (docData: {
    title: string;
    type?: string;
    drive_url?: string;
    folder_id: string | null;
    organization_id: string;
}) => {
    // Pegar o usuario logado
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
        throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
        .from('documents')
        .insert([{
            title: docData.title,
            type: docData.type || 'Outros',
            drive_url: docData.drive_url || '',
            folder_id: docData.folder_id || null,
            organization_id: docData.organization_id,
            user_id: userData.user.id
        }])
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};
