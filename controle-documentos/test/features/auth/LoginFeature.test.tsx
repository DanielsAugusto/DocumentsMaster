import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginFeature from '../../../src/features/auth/LoginFeature';
import { supabase } from '@/lib/supabase';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: vi.fn(),
        },
    },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        useNavigate: () => mockNavigate,
    };
});

describe('LoginFeature', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form correctly', () => {
        render(
            <MemoryRouter>
                <LoginFeature />
            </MemoryRouter>
        );
        expect(screen.getByText(/Entrar na conta/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Entrar$/i })).toBeInTheDocument();
    });

    it('handles input changes', () => {
        render(
            <MemoryRouter>
                <LoginFeature />
            </MemoryRouter>
        );
        const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
        const passwordInput = screen.getByLabelText(/Senha/i) as HTMLInputElement;

        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(emailInput.value).toBe('user@example.com');
        expect(passwordInput.value).toBe('password123');
    });

    it('calls signInWithPassword and navigates on success', async () => {
        vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: null } as any);

        render(
            <MemoryRouter>
                <LoginFeature />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } });
        fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /^Entrar$/i }));

        await waitFor(() => {
            expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: 'user@example.com',
                password: 'password123',
            });
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('shows error message on failure', async () => {
        vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
            data: {},
            error: { message: 'Invalid credentials' }
        } as any);

        render(
            <MemoryRouter>
                <LoginFeature />
            </MemoryRouter>
        );

        // Fill fields to ensure form submit is reached
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'wrong@example.com' } });
        fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: 'wrong' } });

        fireEvent.click(screen.getByRole('button', { name: /^Entrar$/i }));

        expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument();
    });
});
