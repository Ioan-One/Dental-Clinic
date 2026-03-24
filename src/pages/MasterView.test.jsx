import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MasterView from './MasterView';
import { DataProvider } from '../store/DataStore';
import { BrowserRouter } from 'react-router-dom';

describe('MasterView Component', () => {
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
    // Modal title should appear
    expect(screen.getAllByText('Programare Nouă').length).toBeGreaterThan(0);
    expect(screen.getByText('Nume Pacient')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', () => {
    renderComponent();
    fireEvent.click(screen.getByText(/Programare Nouă/i));
    
    // Attempt saving
    fireEvent.click(screen.getByText('Salvează Programarea'));
    
    expect(screen.getByText('Numele pacientului este obligatoriu.')).toBeInTheDocument();
    expect(screen.getByText('Un număr de contact valid (7-15 cifre) este obligatoriu.')).toBeInTheDocument();
  });
});
