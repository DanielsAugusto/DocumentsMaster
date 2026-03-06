import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getFolders,
    getAllFolders,
    createFolder,
    deleteFolder,
    updateFolder,
    moveDocument,
    moveFolder,
    getTrashItems,
    restoreItemFromTrash,
    permanentlyDeleteFromTrash,
    emptyTrash
} from '../../../../src/features/documents/api/folders';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        auth: {
            getUser: vi.fn(),
        },
        rpc: vi.fn(),
    },
}));

describe('folders api', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getFolders', () => {
        it('should fetch folders for a specific parent', async () => {
            const mockData = [{ id: '1', name: 'Folder 1' }];
            const mockFrom = vi.mocked(supabase.from);

            const chain = {
                select: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: (resolve: any) => resolve({ data: mockData, error: null }),
            };

            mockFrom.mockReturnValue(chain as any);

            const result = await getFolders('parent-123');

            expect(mockFrom).toHaveBeenCalledWith('folders');
            expect(result).toEqual(mockData);
        });

        it('should throw error if fetching fails', async () => {
            const mockFrom = vi.mocked(supabase.from);
            const chain = {
                select: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: (resolve: any) => resolve({ data: null, error: { message: 'Database error' } }),
            };
            mockFrom.mockReturnValue(chain as any);

            await expect(getFolders()).rejects.toThrow('Database error');
        });
    });

    describe('getAllFolders', () => {
        it('should fetch all folders for an organization', async () => {
            const mockData = [{ id: '1', name: 'Folder 1' }];
            const mockFrom = vi.mocked(supabase.from);
            const chain = {
                select: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: (resolve: any) => resolve({ data: mockData, error: null }),
            };
            mockFrom.mockReturnValue(chain as any);

            const result = await getAllFolders('org-123');
            expect(result).toEqual(mockData);
        });
    });

    describe('createFolder', () => {
        it('should create a new folder', async () => {
            const mockUser = { user: { id: 'user-123' } };
            const mockFolder = { id: 'new-folder-123', name: 'New Folder' };

            vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser, error: null } as any);

            const mockFrom = vi.mocked(supabase.from);
            const chain = {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockFolder, error: null }),
            };
            mockFrom.mockReturnValue(chain as any);

            const result = await createFolder({ name: 'New Folder', organization_id: 'org-123' });

            expect(result).toEqual(mockFolder);
            expect(supabase.from).toHaveBeenCalledWith('folders');
        });

        it('should throw error if user is not authenticated', async () => {
            vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as any);

            await expect(createFolder({ name: 'New Folder', organization_id: 'org-123' }))
                .rejects.toThrow('Usuário não autenticado');
        });
    });

    describe('deleteFolder', () => {
        it('should call rpc to delete folder', async () => {
            const mockFrom = vi.mocked(supabase.from);
            const mockRpc = vi.mocked(supabase.rpc);

            mockRpc.mockResolvedValue({ error: null } as any);

            await deleteFolder('folder-123', true);

            expect(mockRpc).toHaveBeenCalledWith('delete_folder', {
                target_folder_id: 'folder-123',
                delete_documents: true
            });
        });

        it('should move documents to root if deleteDocuments is false', async () => {
            const mockFrom = vi.mocked(supabase.from);
            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockIs = vi.fn().mockResolvedValue({ error: null });

            mockFrom.mockReturnValue({
                update: mockUpdate,
                eq: mockEq,
                is: mockIs,
            } as any);

            vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any);

            await deleteFolder('folder-123', false);

            expect(mockFrom).toHaveBeenCalledWith('documents');
            expect(mockUpdate).toHaveBeenCalledWith({ folder_id: null });
        });
    });

    describe('updateFolder', () => {
        it('should update folder name', async () => {
            const mockFolder = { id: '1', name: 'Updated Name' };
            const mockFrom = vi.mocked(supabase.from);
            const chain = {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockFolder, error: null }),
            };
            mockFrom.mockReturnValue(chain as any);

            const result = await updateFolder('1', 'Updated Name');
            expect(result).toEqual(mockFolder);
        });
    });

    describe('moveDocument', () => {
        it('should move document to a new folder', async () => {
            const mockFrom = vi.mocked(supabase.from);
            const chain = {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: (resolve: any) => resolve({ data: null, error: null }),
            };
            mockFrom.mockReturnValue(chain as any);

            await moveDocument('doc-1', 'folder-2');
            expect(mockFrom).toHaveBeenCalledWith('documents');
        });
    });

    describe('moveFolder', () => {
        it('should move folder to a new parent', async () => {
            const mockFrom = vi.mocked(supabase.from);
            const chain = {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null }),
            };
            mockFrom.mockReturnValue(chain as any);

            await moveFolder('folder-1', 'parent-2');
            expect(mockFrom).toHaveBeenCalledWith('folders');
        });

        it('should throw error if moving to itself', async () => {
            await expect(moveFolder('folder-1', 'folder-1'))
                .rejects.toThrow("Não é possível mover a pasta para dentro de si mesma.");
        });
    });

    describe('trash functions', () => {
        it('should fetch trash items sorted by date', async () => {
            const mockFolders = [{ id: 'f1', name: 'Folder 1', deleted_at: '2023-01-01T10:00:00Z' }];
            const mockDocs = [{ id: 'd1', title: 'Doc 1', deleted_at: '2023-01-02T10:00:00Z' }];

            const mockFrom = vi.mocked(supabase.from);
            mockFrom.mockImplementation((table: string) => {
                const data = table === 'folders' ? mockFolders : mockDocs;
                return {
                    select: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({ data, error: null }),
                } as any;
            });

            const result = await getTrashItems();
            expect(result).toHaveLength(2);
            expect(result[0].type).toBe('document'); // Newest first (Jan 02 > Jan 01)
        });

        it('should restore item using rpc', async () => {
            const mockRpc = vi.mocked(supabase.rpc);
            mockRpc.mockResolvedValue({ error: null } as any);

            await restoreItemFromTrash('1', 'folder');
            expect(mockRpc).toHaveBeenCalledWith('restore_from_trash', {
                item_id: '1',
                item_type: 'folder'
            });
        });

        it('should permanently delete item using rpc', async () => {
            const mockRpc = vi.mocked(supabase.rpc);
            mockRpc.mockResolvedValue({ error: null } as any);

            await permanentlyDeleteFromTrash('1', 'document');
            expect(mockRpc).toHaveBeenCalledWith('permanently_delete_from_trash', {
                item_id: '1',
                item_type: 'document'
            });
        });

        it('should empty trash using rpc', async () => {
            const mockRpc = vi.mocked(supabase.rpc);
            mockRpc.mockResolvedValue({ error: null } as any);

            await emptyTrash();
            expect(mockRpc).toHaveBeenCalledWith('empty_trash');
        });
    });
});
