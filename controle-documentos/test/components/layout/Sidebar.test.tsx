import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../../../src/components/layout/Sidebar';
import { supabase } from '@/lib/supabase';
import { cn } from '../../../src/lib/utils';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            signOut: vi.fn(),
        },
    },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        useNavigate: () => mockNavigate,
        useLocation: () => ({ pathname: '/' }),
    };
});

vi.mock('../../../src/contexts/WorkspaceContext', () => ({
    useWorkspace: vi.fn(),
}));

describe('Sidebar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders sidebar with navigation items', () => {
        render(
            <MemoryRouter>
                <Sidebar isOpen={true} />
            </MemoryRouter>
        );
        expect(screen.getByText('DocControl')).toBeInTheDocument();
        expect(screen.getByText('Início')).toBeInTheDocument();
        expect(screen.getByText('Documentos')).toBeInTheDocument();
        expect(screen.getByText('Lixeira')).toBeInTheDocument();
    });

    it('calls setIsOpen(false) when close button is clicked', () => {
        const mockSetIsOpen = vi.fn();
        render(
            <MemoryRouter>
                <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
            </MemoryRouter>
        );

        const closeBtn = screen.getByLabelText(/Fechar menu/i);
        fireEvent.click(closeBtn);
        expect(mockSetIsOpen).toHaveBeenCalledWith(false);
    });

    it('handles logout flow correctly', async () => {
        render(
            <MemoryRouter>
                <Sidebar isOpen={true} />
            </MemoryRouter>
        );

        const logoutBtn = screen.getByText(/Sair/i);
        fireEvent.click(logoutBtn);

        // ConfirmModal should appear
        expect(screen.getByText(/Sair do sistema/i)).toBeInTheDocument();

        const confirmBtns = screen.getAllByRole('button', { name: /^Sair$/i });
        fireEvent.click(confirmBtns[confirmBtns.length - 1]);

        await waitFor(() => {
            expect(supabase.auth.signOut).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });
});
