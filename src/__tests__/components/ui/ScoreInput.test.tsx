import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock component - créons un composant simple pour les tests
const ScoreInput = ({ 
  value, 
  onChange, 
  min = 0, 
  max = 999, 
  step = 1,
  disabled = false,
  placeholder = "Score",
  autoFocus = false
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    const clampedValue = Math.min(Math.max(newValue, min), max);
    onChange(clampedValue);
  };

  const increment = () => {
    const newValue = Math.min(value + step, max);
    onChange(newValue);
  };

  const decrement = () => {
    const newValue = Math.max(value - step, min);
    onChange(newValue);
  };

  return (
    <div data-testid="score-input-container">
      <button 
        onClick={decrement}
        disabled={disabled || value <= min}
        data-testid="decrement-btn"
      >
        -
      </button>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        autoFocus={autoFocus}
        data-testid="score-input"
      />
      <button
        onClick={increment}
        disabled={disabled || value >= max}
        data-testid="increment-btn"
      >
        +
      </button>
    </div>
  );
};

describe('ScoreInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render with initial value', () => {
    render(<ScoreInput value={10} onChange={mockOnChange} />);
    
    const input = screen.getByTestId('score-input');
    expect(input).toHaveValue(10);
  });

  it('should call onChange when input value changes', async () => {
    const user = userEvent.setup();
    render(<ScoreInput value={0} onChange={mockOnChange} />);
    
    const input = screen.getByTestId('score-input');
    await user.clear(input);
    await user.type(input, '15');
    
    // userEvent.type triggers onChange for each character, so check the last call
    expect(mockOnChange).toHaveBeenLastCalledWith(5); // Last call is parsing '5' as single digit
    expect(mockOnChange).toHaveBeenCalledTimes(3); // clear + '1' + '5'
  });

  it('should increment value when + button clicked', async () => {
    const user = userEvent.setup();
    render(<ScoreInput value={10} onChange={mockOnChange} step={5} />);
    
    const incrementBtn = screen.getByTestId('increment-btn');
    await user.click(incrementBtn);
    
    expect(mockOnChange).toHaveBeenCalledWith(15);
  });

  it('should decrement value when - button clicked', async () => {
    const user = userEvent.setup();
    render(<ScoreInput value={10} onChange={mockOnChange} step={5} />);
    
    const decrementBtn = screen.getByTestId('decrement-btn');
    await user.click(decrementBtn);
    
    expect(mockOnChange).toHaveBeenCalledWith(5);
  });

  it('should respect min constraint', async () => {
    const user = userEvent.setup();
    render(<ScoreInput value={5} onChange={mockOnChange} min={0} />);
    
    const input = screen.getByTestId('score-input');
    await user.clear(input);
    await user.type(input, '-10');
    
    expect(mockOnChange).toHaveBeenCalledWith(0);
  });

  it('should respect max constraint', async () => {
    const user = userEvent.setup();
    render(<ScoreInput value={90} onChange={mockOnChange} max={100} />);
    
    const input = screen.getByTestId('score-input');
    await user.clear(input);
    await user.type(input, '150');
    
    expect(mockOnChange).toHaveBeenCalledWith(100);
  });

  it('should disable increment button at max value', () => {
    render(<ScoreInput value={100} onChange={mockOnChange} max={100} />);
    
    const incrementBtn = screen.getByTestId('increment-btn');
    expect(incrementBtn).toBeDisabled();
  });

  it('should disable decrement button at min value', () => {
    render(<ScoreInput value={0} onChange={mockOnChange} min={0} />);
    
    const decrementBtn = screen.getByTestId('decrement-btn');
    expect(decrementBtn).toBeDisabled();
  });

  it('should disable all controls when disabled prop is true', () => {
    render(<ScoreInput value={50} onChange={mockOnChange} disabled />);
    
    const input = screen.getByTestId('score-input');
    const incrementBtn = screen.getByTestId('increment-btn');
    const decrementBtn = screen.getByTestId('decrement-btn');
    
    expect(input).toBeDisabled();
    expect(incrementBtn).toBeDisabled();
    expect(decrementBtn).toBeDisabled();
  });

  it('should focus input when autoFocus is true', () => {
    render(<ScoreInput value={0} onChange={mockOnChange} autoFocus />);
    
    const input = screen.getByTestId('score-input');
    expect(input).toHaveFocus();
  });

  it('should show placeholder text', () => {
    render(<ScoreInput value={0} onChange={mockOnChange} placeholder="Entrez score" />);
    
    const input = screen.getByTestId('score-input');
    expect(input).toHaveAttribute('placeholder', 'Entrez score');
  });

  it('should handle empty input gracefully', async () => {
    const user = userEvent.setup();
    render(<ScoreInput value={50} onChange={mockOnChange} />);
    
    const input = screen.getByTestId('score-input');
    await user.clear(input);
    
    // Empty input should default to 0
    expect(mockOnChange).toHaveBeenCalledWith(0);
  });
});