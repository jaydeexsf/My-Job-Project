import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VoiceSearch from '@/components/VoiceSearch';

// Mock the quranApi module
jest.mock('@/lib/quranApi', () => ({
  searchAyat: jest.fn(),
}));

// Mock Web Speech API
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  lang: '',
  interimResults: false,
  continuous: false,
  onresult: null,
  onend: null,
  onerror: null,
};

// Setup global mocks
beforeAll(() => {
  global.SpeechRecognition = jest.fn(() => mockSpeechRecognition);
  global.webkitSpeechRecognition = jest.fn(() => mockSpeechRecognition);
});

describe('VoiceSearch Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the voice search button', () => {
    render(<VoiceSearch />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Press and speak to search');
  });

  it('shows microphone icon when not listening', () => {
    render(<VoiceSearch />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('🎤');
  });

  it('changes state when button is clicked', () => {
    render(<VoiceSearch />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockSpeechRecognition.start).toHaveBeenCalled();
  });

  it('displays transcript when speech is recognized', async () => {
    const { searchAyat } = require('@/lib/quranApi');
    searchAyat.mockResolvedValue({
      results: [
        {
          surah: 1,
          ayah: 1,
          text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
          translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.'
        }
      ]
    });

    render(<VoiceSearch />);
    
    // Simulate speech recognition result
    const mockEvent = {
      results: [
        [{ transcript: 'Bismillah' }]
      ],
      resultIndex: 0
    };

    // Trigger speech recognition
    if (mockSpeechRecognition.onresult) {
      mockSpeechRecognition.onresult(mockEvent);
    }

    await waitFor(() => {
      expect(screen.getByText(/You said:/)).toBeInTheDocument();
      expect(screen.getByText(/Bismillah/)).toBeInTheDocument();
    });
  });

  it('displays search results after speech recognition', async () => {
    const { searchAyat } = require('@/lib/quranApi');
    searchAyat.mockResolvedValue({
      results: [
        {
          surah: 1,
          ayah: 1,
          text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
          translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.'
        }
      ]
    });

    render(<VoiceSearch />);
    
    // Simulate complete speech recognition flow
    const mockEvent = {
      results: [
        [{ transcript: 'Bismillah' }]
      ],
      resultIndex: 0
    };

    if (mockSpeechRecognition.onresult) {
      mockSpeechRecognition.onresult(mockEvent);
    }

    if (mockSpeechRecognition.onend) {
      mockSpeechRecognition.onend();
    }

    await waitFor(() => {
      expect(screen.getByText('Search Results:')).toBeInTheDocument();
      expect(screen.getByText(/In the name of Allah/)).toBeInTheDocument();
      expect(screen.getByText('Surah 1, Ayah 1')).toBeInTheDocument();
    });
  });

  it('handles search errors gracefully', async () => {
    const { searchAyat } = require('@/lib/quranApi');
    searchAyat.mockRejectedValue(new Error('API Error'));

    render(<VoiceSearch />);
    
    const mockEvent = {
      results: [
        [{ transcript: 'test query' }]
      ],
      resultIndex: 0
    };

    if (mockSpeechRecognition.onresult) {
      mockSpeechRecognition.onresult(mockEvent);
    }

    if (mockSpeechRecognition.onend) {
      mockSpeechRecognition.onend();
    }

    await waitFor(() => {
      expect(screen.getByText('Search failed. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables button during search', async () => {
    const { searchAyat } = require('@/lib/quranApi');
    searchAyat.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(<VoiceSearch />);
    
    const button = screen.getByRole('button');
    
    // Simulate speech recognition
    const mockEvent = {
      results: [
        [{ transcript: 'test' }]
      ],
      resultIndex: 0
    };

    if (mockSpeechRecognition.onresult) {
      mockSpeechRecognition.onresult(mockEvent);
    }

    if (mockSpeechRecognition.onend) {
      mockSpeechRecognition.onend();
    }

    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Searching...');
    });
  });

  it('handles no speech recognition support', () => {
    // Temporarily remove speech recognition support
    const originalSpeechRecognition = global.SpeechRecognition;
    const originalWebkitSpeechRecognition = global.webkitSpeechRecognition;
    
    delete (global as any).SpeechRecognition;
    delete (global as any).webkitSpeechRecognition;

    render(<VoiceSearch />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Should not crash and button should still be clickable
    expect(button).toBeInTheDocument();

    // Restore speech recognition
    global.SpeechRecognition = originalSpeechRecognition;
    global.webkitSpeechRecognition = originalWebkitSpeechRecognition;
  });
});
