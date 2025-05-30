import { Novu } from '@novu/api';

const novuApiKey = process.env.NOVU_API_KEY;

if (!novuApiKey) {
  console.error('Error: NOVU_API_KEY is not defined in environment variables.');
  // Optionally, throw an error to prevent the application from starting without the API key
  // throw new Error('NOVU_API_KEY is not defined.');
}

// Initialize Novu with the API key and EU backend URL
const novu = new Novu({
  secretKey: novuApiKey!,
  serverURL: 'https://eu.api.novu.co',
});

export default novu;
