import { supabase } from '@/lib/supabase';

interface DriveFile {
    id: string;
    name: string;
    webViewLink: string;
    mimeType: string;
}

export const extractDriveFolderId = (url: string): string | null => {
    try {
        const parsedUrl = new URL(url);

        const foldersMatch = /\/folders\/([a-zA-Z0-9-_]+)/.exec(parsedUrl.pathname);
        if (foldersMatch?.[1]) {
            return foldersMatch[1];
        }

        const idParam = parsedUrl.searchParams.get('id');
        if (idParam) {
            return idParam;
        }

        return null;
    } catch {
        return null;
    }
}

export const fetchPublicDriveFiles = async (folderId: string): Promise<DriveFile[]> => {
    const { data, error } = await supabase.functions.invoke('google-drive-proxy', {
        body: { action: 'list_files', folderId },
    });

    if (error) {
        throw new Error(error.message || 'Falha ao buscar arquivos do Google Drive.');
    }

    if (data?.error) {
        throw new Error(data.error);
    }

    return data?.files || [];
}

export const fetchDriveFolderInfo = async (folderId: string): Promise<{ id: string; name: string }> => {
    const { data, error } = await supabase.functions.invoke('google-drive-proxy', {
        body: { action: 'get_folder_info', folderId },
    });

    if (error) {
        throw new Error(error.message || 'Erro ao buscar detalhes da pasta.');
    }

    if (data?.error) {
        throw new Error(data.error);
    }

    return data;
}

export const isDriveFolder = (mimeType: string) => {
    return mimeType === 'application/vnd.google-apps.folder';
}
