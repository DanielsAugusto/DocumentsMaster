import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractDriveFolderId, fetchPublicDriveFiles, fetchDriveFolderInfo, isDriveFolder } from '../../../../src/features/documents/api/drive';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        functions: {
            invoke: vi.fn(),
        },
    },
}));

describe('drive api', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('extractDriveFolderId', () => {
        it('should extract id from folders URL', () => {
            const url = 'https://drive.google.com/drive/folders/1abc-123_xyz';
            expect(extractDriveFolderId(url)).toBe('1abc-123_xyz');
        });

        it('should extract id from query param', () => {
            const url = 'https://drive.google.com/open?id=1abc-123_xyz';
            expect(extractDriveFolderId(url)).toBe('1abc-123_xyz');
        });

        it('should return null for invalid URLs', () => {
            expect(extractDriveFolderId('invalid-url')).toBeNull();
            expect(extractDriveFolderId('https://google.com')).toBeNull();
        });
    });

    describe('fetchPublicDriveFiles', () => {
        it('should fetch files using supabase function', async () => {
            const mockFiles = [{ id: '1', name: 'File 1', webViewLink: '', mimeType: '' }];
            vi.mocked(supabase.functions.invoke).mockResolvedValue({
                data: { files: mockFiles },
                error: null,
            } as any);

            const result = await fetchPublicDriveFiles('folder-123');
            expect(result).toEqual(mockFiles);
            expect(supabase.functions.invoke).toHaveBeenCalledWith('google-drive-proxy', {
                body: { action: 'list_files', folderId: 'folder-123' },
            });
        });

        it('should throw error if invocation fails', async () => {
            vi.mocked(supabase.functions.invoke).mockResolvedValue({
                data: null,
                error: { message: 'Cloud function error' },
            } as any);

            await expect(fetchPublicDriveFiles('folder-123')).rejects.toThrow('Cloud function error');
        });

        it('should throw error if function return custom error', async () => {
            vi.mocked(supabase.functions.invoke).mockResolvedValue({
                data: { error: 'Access denied' },
                error: null,
            } as any);

            await expect(fetchPublicDriveFiles('folder-123')).rejects.toThrow('Access denied');
        });
    });

    describe('fetchDriveFolderInfo', () => {
        it('should fetch folder info', async () => {
            const mockInfo = { id: 'f1', name: 'Drive Folder' };
            vi.mocked(supabase.functions.invoke).mockResolvedValue({
                data: mockInfo,
                error: null,
            } as any);

            const result = await fetchDriveFolderInfo('f1');
            expect(result).toEqual(mockInfo);
        });
    });

    describe('isDriveFolder', () => {
        it('should identify drive folder mime type', () => {
            expect(isDriveFolder('application/vnd.google-apps.folder')).toBe(true);
            expect(isDriveFolder('image/png')).toBe(false);
        });
    });
});
