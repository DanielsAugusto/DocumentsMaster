import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DocumentList from '../../src/pages/DocumentList';

// Mock DocumentListFeature to isolate the page wrapper test
vi.mock('../../src/features/documents/DocumentListFeature', () => ({
    default: () => <div data-testid="document-list-feature">Document List Feature</div>
}));

describe('DocumentList Page wrapper', () => {
    it('renders DocumentListFeature', () => {
        render(<DocumentList />);
        expect(screen.getByTestId('document-list-feature')).toBeInTheDocument();
    });
});
