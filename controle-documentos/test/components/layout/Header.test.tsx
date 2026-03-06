import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../../../src/components/layout/Header';

vi.mock('../../../src/components/layout/Sidebar', () => ({
    navItems: [
        { name: 'Início', path: '/', icon: () => null },
    ]
}));

// Mock ModeToggle
vi.mock('@/components/mode-toggle', () => ({
    ModeToggle: () => <div data-testid="mode-toggle">Mode Toggle</div>
}));

const mockLocation = { pathname: '/' };
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        useLocation: () => mockLocation,
    };
});

describe('Header', () => {
    it('renders header with current page title', () => {
        render(
            <MemoryRouter>
                <Header />
            </MemoryRouter>
        );
        expect(screen.getByText('Início')).toBeInTheDocument();
        expect(screen.getByTestId('mode-toggle')).toBeInTheDocument();
    });

    it('calls onMenuClick when menu button is clicked', () => {
        const mockOnMenuClick = vi.fn();
        render(
            <MemoryRouter>
                <Header onMenuClick={mockOnMenuClick} />
            </MemoryRouter>
        );

        const menuBtn = screen.getByLabelText(/Open Mobile Menu/i);
        fireEvent.click(menuBtn);
        expect(mockOnMenuClick).toHaveBeenCalled();
    });
});
