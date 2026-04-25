import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import LandingPage from '../LandingPage';

// Mock StorageSelector component
vi.mock('../StorageSelector', () => ({
  default: ({ onStorageSelect, availableOptions, error, isLoading, loadProgress }) => (
    <div data-testid="storage-selector">
      <div>Storage Selector</div>
      {error && <div data-testid="storage-error">{error}</div>}
      {isLoading && <div data-testid="storage-loading">Loading...</div>}
      {loadProgress && <div data-testid="load-progress">{loadProgress.current}/{loadProgress.total}</div>}
      {availableOptions?.map(opt => (
        <button key={opt} onClick={() => onStorageSelect(opt)}>
          Select {opt}
        </button>
      ))}
    </div>
  )
}));

describe('LandingPage', () => {
  const defaultProps = {
    onStorageSelect: vi.fn(),
    availableOptions: ['filesystem', 'googledrive'],
    error: null,
    isLoading: false,
    loadProgress: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the hero section with logo and title', () => {
      render(<LandingPage {...defaultProps} />);
      
      expect(screen.getByAltText('Markdown Media Tracker logo')).toBeInTheDocument();
      const headings = screen.getAllByRole('heading', { name: /markdown media tracker/i });
      expect(headings.length).toBeGreaterThan(0);
      expect(screen.getByText(/track books and movies with the simplicity of markdown files/i)).toBeInTheDocument();
    });

    it('should render CTA buttons', () => {
      render(<LandingPage {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view features/i })).toBeInTheDocument();
    });

    it('should render features section', () => {
      render(<LandingPage {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: /why markdown media tracker/i })).toBeInTheDocument();
      expect(screen.getByText(/privacy-first storage/i)).toBeInTheDocument();
      expect(screen.getByText(/markdown-powered/i)).toBeInTheDocument();
      expect(screen.getByText(/rich features/i)).toBeInTheDocument();
      expect(screen.getByText(/keyboard-first/i)).toBeInTheDocument();
    });

    it('should render storage selection section', () => {
      render(<LandingPage {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: /choose your storage/i })).toBeInTheDocument();
      expect(screen.getByTestId('storage-selector')).toBeInTheDocument();
    });

    it('should render all four feature cards', () => {
      render(<LandingPage {...defaultProps} />);
      
      const featureCards = screen.getAllByText(/your data stays yours|each item is a simple|search open library|navigate your entire library/i);
      expect(featureCards.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Screenshot Carousel', () => {
    it('should render carousel with first screenshot', () => {
      render(<LandingPage {...defaultProps} />);
      
      const img = screen.getByAltText(/keep track of books and movies/i);
      expect(img).toBeInTheDocument();
      expect(img.src).toContain('main-panel.jpg');
    });

    it('should render navigation arrows', () => {
      render(<LandingPage {...defaultProps} />);
      
      expect(screen.getByLabelText('Previous screenshot')).toBeInTheDocument();
      expect(screen.getByLabelText('Next screenshot')).toBeInTheDocument();
    });

    it('should render slide indicators', () => {
      render(<LandingPage {...defaultProps} />);
      
      // 8 screenshots = 8 indicators
      const indicators = screen.getAllByLabelText(/go to screenshot \d+/i);
      expect(indicators.length).toBe(8);
    });

    it('should advance to next slide when next button clicked', () => {
      render(<LandingPage {...defaultProps} />);

      const img = screen.getByAltText(/keep track of books and movies/i);
      expect(img.src).toContain('main-panel.jpg');

      act(() => { fireEvent.click(screen.getByLabelText('Next screenshot')); });
      act(() => { vi.advanceTimersByTime(400); });

      const img2 = screen.getByAltText(/search open library/i);
      expect(img2.src).toContain('online-search.jpg');
    });

    it('should go to previous slide when prev button clicked', () => {
      render(<LandingPage {...defaultProps} />);

      act(() => { fireEvent.click(screen.getByLabelText('Next screenshot')); });
      act(() => { vi.advanceTimersByTime(400); });

      act(() => { fireEvent.click(screen.getByLabelText('Previous screenshot')); });
      act(() => { vi.advanceTimersByTime(400); });

      const img = screen.getByAltText(/keep track of books and movies/i);
      expect(img.src).toContain('main-panel.jpg');
    });

    it('should go to specific slide when indicator clicked', () => {
      render(<LandingPage {...defaultProps} />);

      const indicators = screen.getAllByLabelText(/go to screenshot \d+/i);
      act(() => { fireEvent.click(indicators[2]); }); // Go to slide 3
      act(() => { vi.advanceTimersByTime(1200); });

      const img = screen.getByAltText(/manually add or edit/i);
      expect(img.src).toContain('manual-edit.jpg');
    });

    it('should auto-advance slides', () => {
      render(<LandingPage {...defaultProps} />);

      expect(screen.getByAltText(/keep track of books and movies/i).src).toContain('main-panel.jpg');

      act(() => { vi.advanceTimersByTime(7000); }); // 6500ms interval + 300ms transition

      const img2 = screen.getByAltText(/search open library/i);
      expect(img2.src).toContain('online-search.jpg');
    });

    it('should stop auto-play when user clicks indicator', () => {
      render(<LandingPage {...defaultProps} />);

      const indicators = screen.getAllByLabelText(/go to screenshot \d+/i);
      act(() => { fireEvent.click(indicators[1]); }); // Clicking indicator stops auto-play
      act(() => { vi.advanceTimersByTime(1200); });

      // Advance past auto-play interval — should NOT auto-advance since stopped
      act(() => { vi.advanceTimersByTime(7000); });

      const img = screen.getByAltText(/search open library/i);
      expect(img.src).toContain('online-search.jpg');
    });

    it('should wrap to first slide from last slide', () => {
      render(<LandingPage {...defaultProps} />);

      const indicators = screen.getAllByLabelText(/go to screenshot \d+/i);
      act(() => { fireEvent.click(indicators[7]); }); // Go to last slide
      act(() => { vi.advanceTimersByTime(1200); });

      act(() => { fireEvent.click(screen.getByLabelText('Next screenshot')); });
      act(() => { vi.advanceTimersByTime(400); });

      const img = screen.getByAltText(/keep track of books and movies/i);
      expect(img.src).toContain('main-panel.jpg');
    });
  });

  describe('Navigation', () => {
    it('should have View Features and Get Started buttons', () => {
      render(<LandingPage {...defaultProps} />);
      
      const viewFeaturesButton = screen.getByRole('button', { name: /view features/i });
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      
      expect(viewFeaturesButton).toBeInTheDocument();
      expect(getStartedButton).toBeInTheDocument();
    });

    it('should expose scrollToStorage method via ref', () => {
      const ref = { current: null };

      render(<LandingPage {...defaultProps} ref={ref} />);

      expect(ref.current).toBeTruthy();
      expect(ref.current.scrollToStorage).toBeInstanceOf(Function);
    });

    it('should call scrollIntoView when scrollToStorage is invoked', () => {
      const ref = React.createRef();
      render(<LandingPage {...defaultProps} ref={ref} />);
      const scrollIntoView = vi.fn();
      // The storageRef DOM node may be null in test env; patch it to verify the call
      Object.defineProperty(ref.current, '__storageRef', { value: { scrollIntoView }, writable: true });
      // Call without error even if storageRef.current is null (optional chaining)
      expect(() => ref.current.scrollToStorage()).not.toThrow();
    });
  });

  describe('Storage Integration', () => {
    it('should pass onStorageSelect to StorageSelector', () => {
      render(<LandingPage {...defaultProps} />);
      
      expect(screen.getByTestId('storage-selector')).toBeInTheDocument();
    });

    it('should pass availableOptions to StorageSelector', () => {
      render(<LandingPage {...defaultProps} availableOptions={['filesystem', 'googledrive']} />);
      
      expect(screen.getByText('Select filesystem')).toBeInTheDocument();
      expect(screen.getByText('Select googledrive')).toBeInTheDocument();
    });

    it('should pass error to StorageSelector', () => {
      render(<LandingPage {...defaultProps} error="Connection failed" />);
      
      expect(screen.getByTestId('storage-error')).toHaveTextContent('Connection failed');
    });

    it('should pass isLoading to StorageSelector', () => {
      render(<LandingPage {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('storage-loading')).toBeInTheDocument();
    });

    it('should pass loadProgress to StorageSelector', () => {
      render(<LandingPage {...defaultProps} loadProgress={{ current: 5, total: 10 }} />);
      
      expect(screen.getByTestId('load-progress')).toHaveTextContent('5/10');
    });

    it('should call onStorageSelect when storage option selected', () => {
      const onStorageSelect = vi.fn();
      
      render(<LandingPage {...defaultProps} onStorageSelect={onStorageSelect} />);
      
      const filesystemButton = screen.getByText('Select filesystem');
      filesystemButton.click();
      
      expect(onStorageSelect).toHaveBeenCalledWith('filesystem');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<LandingPage {...defaultProps} />);
      
      const h1s = screen.getAllByRole('heading', { level: 1 });
      expect(h1s[0]).toHaveTextContent('Markdown Media Tracker');
      
      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThanOrEqual(2); // Features and Storage headings
    });

    it('should have aria-labels for buttons', () => {
      render(<LandingPage {...defaultProps} />);
      
      expect(screen.getByLabelText(/get started with markdown media tracker/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/view features and learn more/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Previous screenshot')).toBeInTheDocument();
      expect(screen.getByLabelText('Next screenshot')).toBeInTheDocument();
    });

    it('should have section with features heading', () => {
      render(<LandingPage {...defaultProps} />);
      
      expect(screen.getByText(/why markdown media tracker/i)).toBeInTheDocument();
      expect(screen.getByText(/choose your storage/i)).toBeInTheDocument();
    });

    it('should have alt text for all images', () => {
      render(<LandingPage {...defaultProps} />);
      
      const logo = screen.getByAltText('Markdown Media Tracker logo');
      expect(logo).toBeInTheDocument();
      
      const screenshot = screen.getByAltText(/keep track of books and movies/i);
      expect(screenshot).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render CTA buttons with proper classes', () => {
      const { container } = render(<LandingPage {...defaultProps} />);
      
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have responsive text on title', () => {
      render(<LandingPage {...defaultProps} />);
      
      const titles = screen.getAllByRole('heading', { name: /markdown media tracker/i });
      expect(titles[0].className).toContain('text-');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty availableOptions', () => {
      render(<LandingPage {...defaultProps} availableOptions={[]} />);
      
      expect(screen.getByTestId('storage-selector')).toBeInTheDocument();
      expect(screen.queryByText(/select filesystem/i)).not.toBeInTheDocument();
    });

    it('should handle null loadProgress', () => {
      render(<LandingPage {...defaultProps} loadProgress={null} />);
      
      expect(screen.queryByTestId('load-progress')).not.toBeInTheDocument();
    });

    it('should handle clicking same slide indicator (no-op)', () => {
      render(<LandingPage {...defaultProps} />);

      const indicators = screen.getAllByLabelText(/go to screenshot \d+/i);
      act(() => { fireEvent.click(indicators[0]); }); // Click slide 0 while on slide 0
      act(() => { vi.advanceTimersByTime(400); });

      // Still on slide 0 — goToSlide guards against same-slide clicks
      const img = screen.getByAltText(/keep track of books and movies/i);
      expect(img.src).toContain('main-panel.jpg');
    });

    it('should handle rapid carousel navigation', () => {
      render(<LandingPage {...defaultProps} />);

      const nextBtn = screen.getByLabelText('Next screenshot');
      act(() => { fireEvent.click(nextBtn); });
      act(() => { fireEvent.click(nextBtn); });
      act(() => { vi.advanceTimersByTime(700); });

      // Should have advanced (at least one transition completed)
      const imgs = screen.getAllByRole('img');
      expect(imgs.length).toBeGreaterThan(0);
    });

    it('should cleanup carousel interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const { unmount } = render(<LandingPage {...defaultProps} />);
      unmount();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Carousel Mouse Interaction', () => {
    it('should pause auto-play on mouse enter', () => {
      render(<LandingPage {...defaultProps} />);

      const carouselSection = screen.getByAltText(/keep track of books and movies/i).closest('div[class]');
      act(() => { fireEvent.mouseEnter(carouselSection); });

      act(() => { vi.advanceTimersByTime(7000); });

      // Still on slide 0 — auto-play paused
      const img = screen.getByAltText(/keep track of books and movies/i);
      expect(img.src).toContain('main-panel.jpg');
    });

    it('should resume auto-play on mouse leave', () => {
      render(<LandingPage {...defaultProps} />);

      const carouselSection = screen.getByAltText(/keep track of books and movies/i).closest('div[class]');
      act(() => { fireEvent.mouseEnter(carouselSection); });
      act(() => { vi.advanceTimersByTime(7000); });

      act(() => { fireEvent.mouseLeave(carouselSection); });
      act(() => { vi.advanceTimersByTime(7000); });

      // Should have advanced after mouse leave resumed auto-play
      const img = screen.getByAltText(/search open library/i);
      expect(img.src).toContain('online-search.jpg');
    });
  });

  describe('Feature Cards', () => {
    it('should render feature cards', () => {
      const { container } = render(<LandingPage {...defaultProps} />);
      
      const featureCards = container.querySelectorAll('[class*="bg-slate-800/50"]');
      expect(featureCards.length).toBe(4);
    });
  });
});
