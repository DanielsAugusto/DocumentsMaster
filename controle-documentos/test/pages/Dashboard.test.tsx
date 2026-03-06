import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../src/pages/Dashboard';
import { useDocuments } from '../../src/features/documents/hooks/useDocuments';
import { useAllFolders } from '../../src/features/documents/hooks/useFolders';

// Mock dependencies
vi.mock('../../src/features/documents/hooks/useDocuments', () => ({
    useDocuments: vi.fn(),
}));

vi.mock('../../src/features/documents/hooks/useFolders', () => ({
    useAllFolders: vi.fn(),
}));

// Mock react-router-dom hooks more robustly
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        useNavigate: () => mockNavigate,
    };
});

describe('Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useDocuments).mockReturnValue({
            data: [
                { id: 'd1', title: 'Doc 1', created_at: new Date().toISOString(), type: 'PDF' },
                { id: 'd2', title: 'Doc 2', created_at: new Date().toISOString(), type: 'DOCX' }
            ],
            isLoading: false,
        } as any);

        vi.mocked(useAllFolders).mockReturnValue({
            data: [{ id: 'f1', name: 'Folder 1' }],
            isLoading: false,
        } as any);
    });

    it('renders dashboard correctly', async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(await screen.findByText(/Encontre o que você precisa/i)).toBeInTheDocument();
        expect(screen.getByText('Doc 1')).toBeInTheDocument();
        expect(screen.getByText('Doc 2')).toBeInTheDocument();
    });

    it('renders empty recent documents state', async () => {
        vi.mocked(useDocuments).mockReturnValue({
            data: [],
            isLoading: false,
        } as any);

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(await screen.findByText(/Nenhum documento recente/i)).toBeInTheDocument();
    });
});
