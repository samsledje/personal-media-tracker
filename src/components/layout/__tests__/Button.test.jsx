import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../Button.jsx';

describe('Button', () => {
  it('should render children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick} disabled>Click me</Button>);
    
    await user.click(screen.getByText('Click me'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply disabled styling when disabled', () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    expect(button).not.toHaveClass('hover:opacity-90');
  });

  it('should apply primary variant styles by default', () => {
    const { container } = render(<Button>Primary</Button>);
    const button = container.querySelector('button');
    expect(button.style.backgroundColor).toBe('var(--mt-highlight)');
    expect(button.style.color).toBe('white');
  });

  it('should apply secondary variant styles', () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveStyle({
      backgroundColor: 'rgba(255,255,255,0.04)',
      color: 'white'
    });
  });

  it('should apply danger variant styles', () => {
    const { container } = render(<Button variant="danger">Danger</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveStyle({
      backgroundColor: 'rgba(255,0,0,0.16)',
      color: 'white'
    });
  });

  it('should apply ghost variant styles', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveStyle({
      backgroundColor: 'transparent',
      color: 'white'
    });
  });

  it('should apply small size classes', () => {
    const { container } = render(<Button size="small">Small</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('px-3', 'py-1', 'text-sm');
  });

  it('should apply medium size classes by default', () => {
    const { container } = render(<Button>Medium</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('px-4', 'py-2');
  });

  it('should apply large size classes', () => {
    const { container } = render(<Button size="large">Large</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
  });

  it('should apply custom className', () => {
    const { container } = render(<Button className="custom-class">Custom</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should apply custom style', () => {
    const customStyle = { marginTop: '10px' };
    const { container } = render(<Button style={customStyle}>Styled</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveStyle({ marginTop: '10px' });
  });

  it('should merge custom style with variant style', () => {
    const customStyle = { marginTop: '10px' };
    const { container } = render(<Button variant="primary" style={customStyle}>Styled</Button>);
    const button = container.querySelector('button');
    expect(button.style.backgroundColor).toBe('var(--mt-highlight)');
    expect(button.style.color).toBe('white');
    expect(button.style.marginTop).toBe('10px');
  });

  it('should pass through additional props', () => {
    const { container } = render(<Button data-testid="button" aria-label="Test button">Test</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveAttribute('data-testid', 'button');
    expect(button).toHaveAttribute('aria-label', 'Test button');
  });

  it('should have base classes for focus and transition', () => {
    const { container } = render(<Button>Base</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'transition');
  });
});
