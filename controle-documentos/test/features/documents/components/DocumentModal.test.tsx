import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentModal } from '../../../../src/features/documents/components/DocumentModal';
import { useAuth } from '../../../../src/features/auth/useAuth';
import { useWorkspace } from '../../../../src/contexts/WorkspaceContext';
import { useDocument } from '../../../../src/features/documents/hooks/useDocument';
import { useAllFolders } from '../../../../src/features/documents/hooks/useFolders';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        auth: {
            getUser: vi.fn(),
        },
    },
}));

vi.mock('../../../../src/features/auth/useAuth', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../../../../src/contexts/WorkspaceContext', () => ({
    useWorkspace: vi.fn(),
}));

vi.mock('../../../../src/features/documents/hooks/useDocument', () => ({
    useDocument: vi.fn(),
}));

vi.mock('../../../../src/features/documents/hooks/useFolders', () => ({
    useAllFolders: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(),
}));

describe('DocumentModal', () => {
    const mockOnClose = vi.fn();
    const mockQueryClient = {
        invalidateQueries: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useQueryClient).mockReturnValue(mockQueryClient as any);
        vi.mocked(useWorkspace).mockReturnValue({
            currentWorkspace: { organization_id: 'org-123' },
        } as any);
        vi.mocked(useAuth).mockReturnValue({
            user: { id: 'user-123' },
        } as any);
        vi.mocked(useAllFolders).mockReturnValue({
            data: [{ id: 'f1', name: 'Folder 1' }],
            isLoading: false,
        } as any);
        vi.mocked(useDocument).mockReturnValue({
            data: null,
            isLoading: false,
        } as any);

        // Mocking createPortal to just render in-place for testing
        vi.mock('react-dom', async () => {
            const actual = await vi.importActual('react-dom');
            return {
                ...actual as any,
                createPortal: (children: any) => children,
            };
        });
    });

    it('renders creation mode correctly', () => {
        render(<DocumentModal isOpen={true} onClose={mockOnClose} />);

        expect(screen.getByText(/Novo Documento/i)).toBeInTheDocument();
        expect(screen.getByText('Gerar e Salvar')).toBeInTheDocument();
    });

    it('renders edit mode when documentId is provided', () => {
        const mockDoc = {
            id: 'doc-123',
            title: 'Existing Doc',
            content: 'Some content',
            folder_id: 'f1',
            keywords: 'tag1, tag2',
            document_date: '2023-01-01',
        };
        vi.mocked(useDocument).mockReturnValue({
            data: mockDoc,
            isLoading: false,
        } as any);

        render(<DocumentModal isOpen={true} onClose={mockOnClose} documentId="doc-123" />);

        expect(screen.getByText(/Editar Documento/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue('Existing Doc')).toBeInTheDocument();
        expect(screen.getByText('Atualizar Metadados')).toBeInTheDocument();
    });

    it('updates form fields', async () => {
        render(<DocumentModal isOpen={true} onClose={mockOnClose} />);

        const titleInput = await screen.findByPlaceholderText(/Ex: Contrato de Prestação de Serviços/i);
        fireEvent.change(titleInput, { target: { value: 'New Title' } });

        expect(titleInput).toHaveValue('New Title');
    });

    it('handles folder selection', async () => {
        render(<DocumentModal isOpen={true} onClose={mockOnClose} />);

        // Initially shows root folder name
        const folderSelector = await screen.findByRole('button', { name: /Sem Pasta/i });
        fireEvent.click(folderSelector);

        // Wait for and click option 1
        const folderOption = await screen.findByText(/Folder 1/);
        fireEvent.click(folderOption);

        // Now it should show Folder 1 as selected
        expect(await screen.findByRole('button', { name: /Folder 1/i })).toBeInTheDocument();
    });

    it('calls submit logic on button click', async () => {
        const mockInsert = vi.fn().mockReturnThis();
        const mockSelect = vi.fn().mockReturnThis();
        const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'new-doc' }, error: null });

        vi.mocked(supabase.from).mockReturnValue({
            insert: mockInsert,
            select: mockSelect,
            single: mockSingle,
        } as any);

        render(<DocumentModal isOpen={true} onClose={mockOnClose} />);

        const titleInput = await screen.findByPlaceholderText(/Ex: Contrato de Prestação de Serviços/i);
        fireEvent.change(titleInput, { target: { value: 'Test Doc' } });

        const driveInput = screen.getByPlaceholderText(/Link compartilhável/i);
        fireEvent.change(driveInput, { target: { value: 'https://drive.google.com/test' } });

        fireEvent.click(screen.getByText('Gerar e Salvar'));

        await waitFor(() => {
            expect(mockInsert).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });
});
