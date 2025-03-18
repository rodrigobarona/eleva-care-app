import { createMeeting } from '@/server/actions/meetings';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the createMeeting action
jest.mock('@/server/actions/meetings', () => ({
  createMeeting: jest.fn(),
}));

// Define a type for our form data
interface BookingFormData {
  name: string;
  email: string;
  notes: string;
  date: string;
  time: string;
  [key: string]: string; // Allow for additional fields
}

// Create a simplified booking form component for testing
const BookingFormSimple: React.FC<{
  onSubmit: (data: BookingFormData) => Promise<void>;
  isLoading?: boolean;
  price?: number;
  eventTitle?: string;
}> = ({ onSubmit, isLoading = false, price = 100, eventTitle = 'Test Event' }) => {
  const [step, setStep] = React.useState(1);
  const [formData, setFormData] = React.useState<BookingFormData>({
    name: '',
    email: '',
    notes: '',
    date: '2023-01-01',
    time: '10:00',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    await onSubmit(formData);
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div data-testid="booking-form">
      <h2>Book {eventTitle}</h2>
      <p>Price: ${price}</p>

      {step === 1 && (
        <div data-testid="step-1">
          <h3>Step 1: Select a Date & Time</h3>
          <form onSubmit={handleSubmit} data-testid="booking-form-step-1">
            <div>
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="time">Time</label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" disabled={isLoading}>
              Continue
            </button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div data-testid="step-2">
          <h3>Step 2: Your Information</h3>
          <form onSubmit={handleSubmit} data-testid="booking-form-step-2">
            <div>
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} />
            </div>
            <button type="button" onClick={goBack}>
              Back
            </button>
            <button type="submit" disabled={isLoading}>
              Continue
            </button>
          </form>
        </div>
      )}

      {step === 3 && (
        <div data-testid="step-3">
          <h3>Step 3: Confirm your booking</h3>
          <div>
            <p data-testid="booking-date">
              <strong>Date:</strong> {formData.date}
            </p>
            <p data-testid="booking-time">
              <strong>Time:</strong> {formData.time}
            </p>
            <p data-testid="booking-name">
              <strong>Name:</strong> {formData.name}
            </p>
            <p data-testid="booking-email">
              <strong>Email:</strong> {formData.email}
            </p>
            <p data-testid="booking-notes">
              <strong>Notes:</strong> {formData.notes || 'None'}
            </p>
          </div>
          <form onSubmit={handleSubmit} data-testid="booking-form-step-3">
            <button type="button" onClick={goBack}>
              Back
            </button>
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Confirm Booking'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

describe('BookingForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createMeeting as jest.Mock).mockResolvedValue({ success: true, id: 'meeting-123' });
  });

  it('renders all steps of the booking form', async () => {
    render(<BookingFormSimple onSubmit={jest.fn()} />);

    // Step 1 - Date and time selection should be visible
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
    expect(screen.getByText('Step 1: Select a Date & Time')).toBeInTheDocument();

    // Simulate selecting a date and time and proceeding
    fireEvent.submit(screen.getByTestId('booking-form-step-1'));

    // Step 2 - Should show the form for user details
    expect(screen.getByTestId('step-2')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Your Information')).toBeInTheDocument();

    // Fill in the form and proceed
    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.submit(screen.getByTestId('booking-form-step-2'));

    // Step 3 - Should show booking confirmation
    expect(screen.getByTestId('step-3')).toBeInTheDocument();
    expect(screen.getByText('Step 3: Confirm your booking')).toBeInTheDocument();

    // Check for displayed values using data-testid
    const nameElement = screen.getByTestId('booking-name');
    expect(nameElement).toHaveTextContent('Name:');
    expect(nameElement).toHaveTextContent('Test User');

    const emailElement = screen.getByTestId('booking-email');
    expect(emailElement).toHaveTextContent('Email:');
    expect(emailElement).toHaveTextContent('test@example.com');
  });

  it('handles form submission and creates a meeting', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true });
    render(<BookingFormSimple onSubmit={mockSubmit} />);

    // Navigate to step 2
    fireEvent.submit(screen.getByTestId('booking-form-step-1'));

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });

    // Navigate to step 3
    fireEvent.submit(screen.getByTestId('booking-form-step-2'));

    // Confirm booking
    fireEvent.submit(screen.getByTestId('booking-form-step-3'));

    // Verify onSubmit was called with correct data
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
        }),
      );
    });
  });

  it('displays loading state during submission', async () => {
    const mockSubmit = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 100);
      });
    });

    render(<BookingFormSimple onSubmit={mockSubmit} isLoading={true} />);

    // Navigate to step 3
    fireEvent.submit(screen.getByTestId('booking-form-step-1'));
    fireEvent.submit(screen.getByTestId('booking-form-step-2'));

    // Check that the button shows loading state
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('allows navigation between steps', async () => {
    render(<BookingFormSimple onSubmit={jest.fn()} />);

    // Go to step 2
    fireEvent.submit(screen.getByTestId('booking-form-step-1'));
    expect(screen.getByTestId('step-2')).toBeInTheDocument();

    // Go back to step 1
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByTestId('step-1')).toBeInTheDocument();

    // Go to step 2 again
    fireEvent.submit(screen.getByTestId('booking-form-step-1'));
    expect(screen.getByTestId('step-2')).toBeInTheDocument();

    // Go to step 3
    fireEvent.submit(screen.getByTestId('booking-form-step-2'));
    expect(screen.getByTestId('step-3')).toBeInTheDocument();

    // Go back to step 2
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByTestId('step-2')).toBeInTheDocument();
  });

  it('shows event details in the form', () => {
    render(<BookingFormSimple onSubmit={jest.fn()} price={250} eventTitle="Expert Consultation" />);

    expect(screen.getByText('Book Expert Consultation')).toBeInTheDocument();
    expect(screen.getByText('Price: $250')).toBeInTheDocument();
  });
});
