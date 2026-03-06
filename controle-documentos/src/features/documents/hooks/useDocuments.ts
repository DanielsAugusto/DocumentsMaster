import { useQuery } from '@tanstack/react-query';
import { getDocuments, Document } from '../api/getDocuments';

export const useDocuments = (folderId: string | null = null, organizationId?: string) => {
    return useQuery<Document[], Error>({
        queryKey: ['documents', folderId, organizationId],
        queryFn: () => getDocuments(folderId, organizationId),
    });
};
