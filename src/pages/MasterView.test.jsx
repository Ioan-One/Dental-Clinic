import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MasterView from './MasterView';
import { DataProvider } from '../store/DataStore';
import { BrowserRouter } from 'react-router-dom';

describe('MasterView Component', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    vi.stubGlobal('WebSocket', class { onmessage = null; close() {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <DataProvider>
        <MasterView />
      </DataProvider>
    </BrowserRouter>
  );

  it('renders the Master View title and table', () => {
    renderComponent();
    expect(screen.getByText('Managementul Programărilor')).toBeInTheDocument();
    expect(screen.getByText('Programare Nouă')).toBeInTheDocument();
  });

  it('opens modal when New Appointment is clicked', () => {
    renderComponent();
    const btn = screen.getByText(/Programare Nouă/i);
    fireEvent.click(btn);
    expect(screen.getAllByText('Programare Nouă').length).toBeGreaterThan(0);
    expect(screen.getByText('Selectează Pacient...')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', () => {
    renderComponent();
    fireEvent.click(screen.getByText(/Programare Nouă/i));

    fireEvent.click(screen.getByText('Salvează Programarea'));

    expect(screen.getByText('Numele pacientului este obligatoriu.')).toBeInTheDocument();
    expect(screen.getByText('Numele medicului este obligatoriu.')).toBeInTheDocument();
  });
});
