import { useQuery } from '@tanstack/react-query';
import { getDocuments, Document } from '../api/getDocuments';

export const useDocuments = () => {
    return useQuery<Document[], Error>({
        queryKey: ['documents'],
        queryFn: getDocuments,
    });
};
