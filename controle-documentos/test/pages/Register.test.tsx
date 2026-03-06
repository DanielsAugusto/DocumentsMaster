import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Register from '../../src/pages/Register';

// Mock RegisterFeature to isolate the page wrapper test
vi.mock('../../src/features/auth/RegisterFeature', () => ({
    default: () => <div data-testid="register-feature">Register Feature</div>
}));

describe('Register Page wrapper', () => {
    it('renders RegisterFeature', () => {
        render(<Register />);
        expect(screen.getByTestId('register-feature')).toBeInTheDocument();
    });
});
