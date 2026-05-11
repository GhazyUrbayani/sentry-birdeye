import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TokenCard } from './TokenCard';
import { TokenCardSkeleton } from './TokenCardSkeleton';

describe('TokenCard', () => {
  it('renders SAFE grade with green badge styles', () => {
    render(
      <TokenCard
        token={{
          id: 'x',
          address: 'So11111111111111111111111111111111111111112',
          symbol: 'TEST',
          score: 90,
          grade: 'SAFE',
          flags: [],
          scannedAt: new Date().toISOString(),
        }}
      />,
    );
    expect(screen.getByText('SAFE').className).toContain('bg-emerald');
  });

  it('renders skeleton without layout shift (snapshot)', () => {
    const { container } = render(<TokenCardSkeleton />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

