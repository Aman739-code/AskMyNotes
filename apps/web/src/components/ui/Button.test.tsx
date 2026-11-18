import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button UI Component', () => {
  it('renders with children and primary variant classes', () => {
    render(<Button variant="primary">Start Studying</Button>);
    const btn = screen.getByRole('button', { name: /start studying/i });
    expect(btn).toBeDefined();
    expect(btn.className).toContain('btn-primary');
  });

  it('renders disabled attribute when isLoading is true', () => {
    render(<Button isLoading>Loading Action</Button>);
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('renders danger variant properly', () => {
    render(<Button variant="danger">Delete Note</Button>);
    const btn = screen.getByRole('button', { name: /delete note/i });
    expect(btn.className).toContain('btn-danger');
  });
});
