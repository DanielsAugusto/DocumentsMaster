import { useQuery } from '@tanstack/react-query';
import { getDocuments, Document } from '../api/getDocuments';

export const useDocuments = (folderId: string | null | 'all' = null) => {
    return useQuery<Document[], Error>({
        queryKey: ['documents', folderId],
        queryFn: () => getDocuments(folderId),
    });
};
