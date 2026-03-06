import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RegisterFeature from '../../../src/features/auth/RegisterFeature';
import { supabase } from '@/lib/supabase';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            signUp: vi.fn(),
        },
    },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        useNavigate: () => mockNavigate,
        Link: ({ children, to }: any) => <a href={to}>{children}</a>,
    };
});

describe('RegisterFeature', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders register form correctly', () => {
        render(
            <MemoryRouter>
                <RegisterFeature />
            </MemoryRouter>
        );
        expect(screen.getByText(/Criar nova conta/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cadastrar/i })).toBeInTheDocument();
    });

    it('handles input changes', () => {
        render(
            <MemoryRouter>
                <RegisterFeature />
            </MemoryRouter>
        );
        const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
        const passwordInput = screen.getByLabelText(/Senha/i) as HTMLInputElement;

        fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(emailInput.value).toBe('newuser@example.com');
        expect(passwordInput.value).toBe('password123');
    });

    it('calls signUp and navigates on success', async () => {
        vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: {}, error: null } as any);

        render(
            <MemoryRouter>
                <RegisterFeature />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'newuser@example.com' } });
        fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /Cadastrar/i }));

        await waitFor(() => {
            expect(supabase.auth.signUp).toHaveBeenCalledWith({
                email: 'newuser@example.com',
                password: 'password123',
            });
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('shows error message on failure', async () => {
        vi.mocked(supabase.auth.signUp).mockResolvedValue({
            data: {},
            error: { message: 'Email already in use' }
        } as any);

        render(
            <MemoryRouter>
                <RegisterFeature />
            </MemoryRouter>
        );

        // Fill fields to ensure form submit is reached
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'existing@example.com' } });
        fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: 'password123' } });

        fireEvent.click(screen.getByRole('button', { name: /Cadastrar/i }));

        expect(await screen.findByText(/Email already in use/i)).toBeInTheDocument();
    });
});
