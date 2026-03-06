import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Login from '../../src/pages/Login';

// Mock LoginFeature to isolate the page wrapper test
vi.mock('../../src/features/auth/LoginFeature', () => ({
    default: () => <div data-testid="login-feature">Login Feature</div>
}));

describe('Login Page wrapper', () => {
    it('renders LoginFeature', () => {
        render(<Login />);
        expect(screen.getByTestId('login-feature')).toBeInTheDocument();
    });
});
