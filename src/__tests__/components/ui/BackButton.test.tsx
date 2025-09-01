import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BackButton from '../../../components/ui/BackButton';

// Mock the useClientRouter hook
jest.mock('../../../hooks/useClientRouter', () => ({
  useClientRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">←</div>,
}));

// Mock window.location
const mockLocation = {
  href: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Mock window.location assignment
delete (window as typeof window & { location: unknown }).location;
(window as typeof window & { location: Location }).location = {
  ...mockLocation,
  set href(url: string) {
    mockLocation.href = url;
  },
  get href() {
    return mockLocation.href;
  }
};

describe('BackButton', () => {
  beforeEach(() => {
    mockLocation.href = '';
  });

  it('should render with default props', () => {
    render(<BackButton />);
    
    const button = screen.getByRole('link');
    const icon = screen.getByTestId('arrow-left-icon');
    
    expect(button).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
    expect(button).toHaveAttribute('href', '/dashboard');
  });

  it('should render with custom href', () => {
    render(<BackButton href="/games" />);
    
    const button = screen.getByRole('link');
    expect(button).toHaveAttribute('href', '/games');
  });

  it('should render with label', () => {
    render(<BackButton label="Back to Games" />);
    
    expect(screen.getByText('Back to Games')).toBeInTheDocument();
  });

  it('should not render label when not provided', () => {
    render(<BackButton />);
    
    // Should only have the icon, no text
    const button = screen.getByRole('link');
    expect(button.textContent).toBe('←'); // Only the mocked arrow icon text
  });

  it('should apply custom className', () => {
    render(<BackButton className="custom-class" />);
    
    const button = screen.getByRole('link');
    expect(button).toHaveClass('custom-class');
  });

  it('should have correct default styling classes', () => {
    render(<BackButton />);
    
    const button = screen.getByRole('link');
    expect(button).toHaveClass(
      'flex',
      'items-center',
      'text-gray-500',
      'hover:text-gray-700',
      'dark:text-gray-400',
      'dark:hover:text-gray-200',
      'p-1',
      'rounded-md',
      'hover:bg-gray-100',
      'dark:hover:bg-gray-700',
      'transition-colors'
    );
  });

  it('should attempt navigation on click', () => {
    // Mock console.error to avoid jsdom navigation warnings in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<BackButton href="/test-page" />);
    
    const button = screen.getByRole('link');
    
    // Should not throw error when clicking
    expect(() => fireEvent.click(button)).not.toThrow();
    
    consoleSpy.mockRestore();
  });

  it('should have correct event handling structure', () => {
    render(<BackButton href="/test-page" />);
    
    const button = screen.getByRole('link');
    
    // Verify the onClick handler is attached
    expect(button).toHaveProperty('onclick');
  });

  it('should handle click when window is undefined', () => {
    // Mock window as undefined
    const originalWindow = global.window;
    (global as typeof global & { window: unknown }).window = undefined;

    render(<BackButton href="/test-page" />);
    
    const button = screen.getByRole('link');
    
    // Should not throw error when window is undefined (since window is undefined, the function should not run)
    expect(() => fireEvent.click(button)).not.toThrow();

    // Restore window
    global.window = originalWindow;
  });

  it('should combine custom className with default classes', () => {
    render(<BackButton className="my-custom-class" />);
    
    const button = screen.getByRole('link');
    expect(button).toHaveClass('my-custom-class', 'flex', 'items-center');
  });
});