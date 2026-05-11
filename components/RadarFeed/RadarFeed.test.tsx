import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadarFeed } from './RadarFeed';

describe('RadarFeed', () => {
  it('renders a heading', () => {
    render(<RadarFeed />);
    expect(screen.getByText('Live Radar')).toBeInTheDocument();
  });
});

