import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioEqualizer } from '@/components/AudioEqualizer';

describe('AudioEqualizer', () => {
  it('renders all EQ presets', () => {
    render(<AudioEqualizer onEQChange={vi.fn()} />);
    expect(screen.getByText('Flat')).toBeInTheDocument();
    expect(screen.getByText('Auditorium')).toBeInTheDocument();
    expect(screen.getByText('Lecture Hall')).toBeInTheDocument();
    expect(screen.getByText('Clarity')).toBeInTheDocument();
    expect(screen.getByText('Warm')).toBeInTheDocument();
    expect(screen.getByText('Outdoor')).toBeInTheDocument();
    expect(screen.getByText('Voice Boost')).toBeInTheDocument();
    expect(screen.getByText('De-Ess')).toBeInTheDocument();
  });

  it('calls onEQChange when preset is applied', () => {
    const onEQChange = vi.fn();
    render(<AudioEqualizer onEQChange={onEQChange} />);
    fireEvent.click(screen.getByText('Clarity'));
    // Clarity preset: bass=-2, mid=3, treble=2
    expect(onEQChange).toHaveBeenCalledWith('bass', -2);
    expect(onEQChange).toHaveBeenCalledWith('mid', 3);
    expect(onEQChange).toHaveBeenCalledWith('treble', 2);
  });

  it('renders enhancement toggles when provided', () => {
    const enhancements = { noiseSuppression: true, echoCancellation: true, autoGainControl: false };
    render(
      <AudioEqualizer
        onEQChange={vi.fn()}
        enhancements={enhancements}
        onEnhancementChange={vi.fn()}
      />
    );
    expect(screen.getByText('Noise Suppression')).toBeInTheDocument();
    expect(screen.getByText('Echo Cancellation')).toBeInTheDocument();
    expect(screen.getByText('Auto Gain Control')).toBeInTheDocument();
  });

  it('does not render enhancement toggles when not provided', () => {
    render(<AudioEqualizer onEQChange={vi.fn()} />);
    expect(screen.queryByText('Noise Suppression')).not.toBeInTheDocument();
  });

  it('renders volume control when onVolumeChange provided', () => {
    render(<AudioEqualizer onEQChange={vi.fn()} onVolumeChange={vi.fn()} />);
    expect(screen.getByText('Volume')).toBeInTheDocument();
  });

  it('renders audio level meter when inputLevel > 0', () => {
    render(<AudioEqualizer onEQChange={vi.fn()} inputLevel={42} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('shows EQ band labels', () => {
    render(<AudioEqualizer onEQChange={vi.fn()} />);
    expect(screen.getByText('Bass')).toBeInTheDocument();
    expect(screen.getByText('Mid')).toBeInTheDocument();
    expect(screen.getByText('Treble')).toBeInTheDocument();
  });
});
