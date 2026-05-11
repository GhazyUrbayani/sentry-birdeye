import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GradeBadge } from './GradeBadge';

describe('GradeBadge', () => {
  it('renders SAFE grade with green class', () => {
    render(<GradeBadge grade="SAFE" />);
    const el = screen.getByText('SAFE');
    expect(el.className).toContain('bg-emerald');
  });
});

