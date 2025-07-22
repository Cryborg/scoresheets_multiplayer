import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render with default message', () => {
    render(<LoadingSpinner />);
    
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<LoadingSpinner message="Loading custom data..." />);
    
    expect(screen.getByText('Loading custom data...')).toBeInTheDocument();
  });

  it('should apply default className', () => {
    const { container } = render(<LoadingSpinner />);
    
    const spinnerDiv = container.firstChild as HTMLElement;
    expect(spinnerDiv).toHaveClass('min-h-screen', 'bg-gray-50', 'dark:bg-gray-900', 'flex', 'items-center', 'justify-center');
  });

  it('should apply custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);
    
    const spinnerDiv = container.firstChild as HTMLElement;
    expect(spinnerDiv).toHaveClass('custom-class', 'flex', 'items-center', 'justify-center');
  });

  it('should combine custom className with flex classes', () => {
    const { container } = render(<LoadingSpinner className="p-4 bg-blue-100" />);
    
    const spinnerDiv = container.firstChild as HTMLElement;
    expect(spinnerDiv).toHaveClass('p-4', 'bg-blue-100', 'flex', 'items-center', 'justify-center');
  });

  it('should render text with correct styling', () => {
    render(<LoadingSpinner message="Test message" />);
    
    const textElement = screen.getByText('Test message');
    expect(textElement).toHaveClass('text-gray-500', 'dark:text-gray-400');
  });
});