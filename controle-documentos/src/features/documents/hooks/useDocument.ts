import { useQuery } from '@tanstack/react-query';
import { getDocument } from '../api/getDocument';

export const useDocument = (id?: string) => {
    return useQuery({
        queryKey: ['document', id],
        queryFn: () => getDocument(id!),
        enabled: !!id, // Only run the query if an ID is provided
    });
};
