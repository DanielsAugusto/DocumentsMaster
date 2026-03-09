import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFolders, getAllFolders, createFolder, deleteFolder, moveDocument, moveFolder, updateFolder } from '../api/folders';

export const useFolders = (parentId: string | null = null, organizationId?: string) => {
    return useQuery({
        queryKey: ['folders', parentId, organizationId],
        queryFn: () => getFolders(parentId, organizationId),
    });
};

export const useAllFolders = (organizationId?: string) => {
    return useQuery({
        queryKey: ['folders', 'all', organizationId],
        queryFn: () => getAllFolders(organizationId),
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
            queryClient.invalidateQueries({ queryKey: ['folders'] });
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

export const useMoveFolder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ folderId, targetParentId }: { folderId: string, targetParentId: string | null }) => moveFolder(folderId, targetParentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
    });
};
