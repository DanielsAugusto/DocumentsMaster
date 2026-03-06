import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFolders, getAllFolders, createFolder, deleteFolder, moveDocument, updateFolder } from '../api/folders';

export const useFolders = (parentId: string | null = null) => {
    return useQuery({
        queryKey: ['folders', parentId],
        queryFn: () => getFolders(parentId),
    });
};

export const useAllFolders = () => {
    return useQuery({
        queryKey: ['folders', 'all'],
        queryFn: getAllFolders,
    });
};

export const useCreateFolder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createFolder,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['folders', variables.parent_id || null] });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
    });
};

export const useDeleteFolder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, deleteDocuments }: { id: string, deleteDocuments: boolean }) => deleteFolder(id, deleteDocuments),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        },
    });
};

export const useMoveDocument = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ documentId, folderId }: { documentId: string, folderId: string | null }) => moveDocument(documentId, folderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        },
    });
};

export const useUpdateFolder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, name }: { id: string, name: string }) => updateFolder(id, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
    });
};
