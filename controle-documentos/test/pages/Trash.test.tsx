import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Trash from '../../src/pages/Trash';
import { getTrashItems, restoreItemFromTrash, permanentlyDeleteFromTrash, emptyTrash } from '../../src/features/documents/api/folders';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../../src/contexts/WorkspaceContext';

// Mock dependencies
vi.mock('../../src/features/documents/api/folders', () => ({
    getTrashItems: vi.fn(),
    restoreItemFromTrash: vi.fn(),
    permanentlyDeleteFromTrash: vi.fn(),
    emptyTrash: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(),
}));

vi.mock('../../src/contexts/WorkspaceContext', () => ({
    useWorkspace: vi.fn(),
}));

vi.mock('lucide-react', () => ({
    Trash2: () => <div data-testid="trash-icon" />,
    RefreshCw: () => <div data-testid="refresh-icon" />,
    Folder: () => <div data-testid="folder-icon" />,
    File: () => <div data-testid="file-icon" />,
    AlertCircle: () => <div data-testid="alert-icon" />,
    ArrowLeft: () => <div data-testid="back-icon" />,
    ChevronRight: () => <div data-testid="chevron-icon" />,
}));

// Mock ConfirmModal since it might have complex internal logic
vi.mock('../../src/components/ui/confirm-modal', () => ({
    ConfirmModal: ({ isOpen, onConfirm, title }: any) => isOpen ? (
        <div data-testid="confirm-modal">
            <h1>{title}</h1>
            <button onClick={onConfirm}>Confirmar</button>
        </div>
    ) : null,
}));

describe('Trash Page', () => {
    const mockInvalidateQueries = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useQueryClient).mockReturnValue({
            invalidateQueries: mockInvalidateQueries,
        } as any);
        vi.mocked(useWorkspace).mockReturnValue({
            currentWorkspace: { organization_id: 'org-123' },
        } as any);

        // Default useQuery behavior
        vi.mocked(useQuery).mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
        } as any);

        // Default useMutation behavior
        vi.mocked(useMutation).mockImplementation(({ mutationFn }: any) => ({
            mutate: (vars: any) => mutationFn(vars),
            isLoading: false,
        } as any));
    });

    it('renders empty state when no items are returned', () => {
        render(<Trash />);
        expect(screen.getByText(/Lixeira vazia/i)).toBeInTheDocument();
    });

    it('renders trash items when data is present', () => {
        const mockItems = [
            { id: '1', name: 'Deleted Doc', type: 'document', deleted_at: new Date().toISOString() },
            { id: '2', name: 'Deleted Folder', type: 'folder', deleted_at: new Date().toISOString() },
        ];
        vi.mocked(useQuery).mockReturnValue({
            data: mockItems,
            isLoading: false,
            error: null,
        } as any);

        render(<Trash />);

        expect(screen.getByText('Deleted Doc')).toBeInTheDocument();
        expect(screen.getByText('Deleted Folder')).toBeInTheDocument();
    });

    it('opens restore confirmation modal when restore button is clicked', async () => {
        const mockItems = [
            { id: '1', name: 'Deleted Doc', type: 'document', deleted_at: new Date().toISOString() },
        ];
        vi.mocked(useQuery).mockReturnValue({ data: mockItems } as any);

        render(<Trash />);

        const restoreBtn = screen.getByRole('button', { name: /Restaurar/i });
        fireEvent.click(restoreBtn);

        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
        expect(screen.getByText(/Restaurar Item/i)).toBeInTheDocument();
    });

    it('calls emptyTrash when "Esvaziar Lixeira" is confirmed', async () => {
        const mockItems = [
            { id: '1', name: 'Item', type: 'document', deleted_at: new Date().toISOString() },
        ];
        vi.mocked(useQuery).mockReturnValue({ data: mockItems } as any);
        vi.mocked(emptyTrash).mockResolvedValue(undefined);

        render(<Trash />);

        const emptyBtn = screen.getByText(/Esvaziar Lixeira/i);
        fireEvent.click(emptyBtn);

        const confirmBtn = screen.getByText('Confirmar');
        fireEvent.click(confirmBtn);

        expect(emptyTrash).toHaveBeenCalled();
    });

    it('handles multi-selection and multi-restore', async () => {
        const mockItems = [
            { id: '1', name: 'Doc 1', type: 'document', deleted_at: new Date().toISOString() },
            { id: '2', name: 'Doc 2', type: 'document', deleted_at: new Date().toISOString() },
        ];
        vi.mocked(useQuery).mockReturnValue({ data: mockItems } as any);
        vi.mocked(restoreItemFromTrash).mockResolvedValue(undefined);

        render(<Trash />);

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        fireEvent.click(checkboxes[1]);

        const multiRestoreBtn = screen.getByText(/Restaurar Selecionados/i);
        fireEvent.click(multiRestoreBtn);

        const confirmBtn = screen.getByText('Confirmar');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(restoreItemFromTrash).toHaveBeenCalledTimes(2);
        });
    });
});
