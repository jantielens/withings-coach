import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: [],
    sendMessage: jest.fn(),
    stop: jest.fn(),
    status: 'ready',
    error: null,
    clearError: jest.fn(),
  }),
}));

jest.mock('react-markdown', () => {
  return function MockMarkdown({ children }: { children: string }) {
    return children;
  };
});
jest.mock('remark-gfm', () => () => {});

import { ChatPanel } from '@/components/ChatPanel';

describe('ChatPanel', () => {
  it('renders without crashing', () => {
    render(<ChatPanel />);
    expect(screen.getByText('Coach Chat')).toBeInTheDocument();
  });

  it('shows "Coach Chat" header', () => {
    render(<ChatPanel />);
    const header = screen.getByText('Coach Chat');
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe('H2');
  });

  it('shows suggested prompts in empty state', () => {
    render(<ChatPanel />);
    expect(screen.getByText('How was last week?')).toBeInTheDocument();
    expect(
      screen.getByText('Summarize my blood pressure')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Any trends I should worry about?')
    ).toBeInTheDocument();
    expect(
      screen.getByText('What time of day are my readings best?')
    ).toBeInTheDocument();
  });

  it('has an input field with placeholder text', () => {
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText('Ask about your health data…');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('has a send button', () => {
    render(<ChatPanel />);
    const sendBtn = screen.getByRole('button', { name: /send message/i });
    expect(sendBtn).toBeInTheDocument();
  });
});
