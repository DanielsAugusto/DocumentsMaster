import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DocumentListFeature from '../../../src/features/documents/DocumentListFeature';
import { useDocuments } from '../../../src/features/documents/hooks/useDocuments';
import { useFolders, useAllFolders } from '../../../src/features/documents/hooks/useFolders';
import { useWorkspace } from '../../../src/contexts/WorkspaceContext';

// Mock dependencies
vi.mock('../../../src/features/documents/hooks/useDocuments', () => ({
    useDocuments: vi.fn(),
}));

vi.mock('../../../src/features/documents/hooks/useFolders', () => ({
    useFolders: vi.fn(),
    useAllFolders: vi.fn(),
}));

vi.mock('../../../src/contexts/WorkspaceContext', () => ({
    useWorkspace: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: vi.fn(),
    })),
    useMutation: vi.fn(() => ({
        mutate: vi.fn(),
        isLoading: false,
    })),
}));

// Mock react-router-dom hooks more robustly
const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        useNavigate: () => mockNavigate,
        useLocation: vi.fn(() => ({ pathname: '/', search: '', hash: '', state: null })),
        useSearchParams: vi.fn(() => [new URLSearchParams(), mockSetSearchParams]),
    };
});

// Mock internal components to simplify testing
vi.mock('../../../src/features/documents/components/DocumentModal', () => ({ DocumentModal: () => null }));
vi.mock('../../../src/features/documents/components/FolderModal', () => ({ FolderModal: () => null }));
vi.mock('../../../src/features/documents/components/DeleteFolderModal', () => ({ DeleteFolderModal: () => null }));
vi.mock('../../../src/features/documents/components/RenameFolderModal', () => ({ RenameFolderModal: () => null }));
vi.mock('../../../src/features/documents/components/MoveMultipleModal', () => ({ MoveMultipleModal: () => null }));
vi.mock('../../../src/features/documents/components/ImportDriveModal', () => ({ ImportDriveModal: () => null }));
vi.mock('../../../src/features/documents/components/CreateFolderModal', () => ({ CreateFolderModal: () => null }));
vi.mock('../../../src/features/documents/components/MoveDocumentModal', () => ({ MoveDocumentModal: () => null }));
vi.mock('../../../src/features/documents/components/MoveFolderModal', () => ({ MoveFolderModal: () => null }));

describe('DocumentListFeature', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useWorkspace).mockReturnValue({
            currentWorkspace: { organization_id: 'org-123' },
        } as any);

        vi.mocked(useFolders).mockReturnValue({
            data: [{ id: 'f1', name: 'Folder A', parent_id: null }],
            isLoading: false,
        } as any);

        vi.mocked(useAllFolders).mockReturnValue({
            data: [{ id: 'f1', name: 'Folder A', parent_id: null }],
            isLoading: false,
        } as any);

        vi.mocked(useDocuments).mockReturnValue({
            data: [{ id: 'd1', title: 'Doc A', folder_id: null, keywords: 'tag1' }],
            isLoading: false,
        } as any);
    });

    it('renders basic component structure', async () => {
        render(
            <MemoryRouter>
                <DocumentListFeature />
            </MemoryRouter>
        );
        expect(await screen.findByPlaceholderText(/Buscar por título/i)).toBeInTheDocument();
    });

    it('shows folders and documents', async () => {
        render(
            <MemoryRouter>
                <DocumentListFeature />
            </MemoryRouter>
        );
        expect(await screen.findByText('Folder A')).toBeInTheDocument();
        expect(await screen.findByText('Doc A')).toBeInTheDocument();
    });

    it('updates search term and filters documents', async () => {
        render(
            <MemoryRouter>
                <DocumentListFeature />
            </MemoryRouter>
        );

        const searchInput = screen.getByPlaceholderText(/Buscar por título/i);
        fireEvent.change(searchInput, { target: { value: 'Query' } });

        expect(searchInput).toHaveValue('Query');
        await waitFor(() => {
            expect(mockSetSearchParams).toHaveBeenCalled();
        });
    });

    it('navigates into a folder when clicked', async () => {
        render(
            <MemoryRouter>
                <DocumentListFeature />
            </MemoryRouter>
        );

        const folderLink = await screen.findByText('Folder A');
        fireEvent.click(folderLink);
    });

    it('opens create folder modal', async () => {
        render(
            <MemoryRouter>
                <DocumentListFeature />
            </MemoryRouter>
        );

        const newFolderBtn = screen.getByRole('button', { name: /Nova Pasta/i });
        fireEvent.click(newFolderBtn);
    });

    it('opens document modal for item', async () => {
        render(
            <MemoryRouter>
                <DocumentListFeature />
            </MemoryRouter>
        );

        const newDocBtn = screen.getByRole('button', { name: /Novo Arquivo/i });
        fireEvent.click(newDocBtn);
    });
});
