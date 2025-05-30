import { Novu } from '@novu/node';

const novuApiKey = process.env.NOVU_API_KEY;

if (!novuApiKey) {
  console.error('Error: NOVU_API_KEY is not defined in environment variables.');
  // Optionally, throw an error to prevent the application from starting without the API key
  // throw new Error('NOVU_API_KEY is not defined.');
}

// Initialize Novu with the API key
// We check novuApiKey above, but typescript might still complain it could be undefined.
// Using a non-null assertion (!) or a check here if you prefer.
const novu = new Novu(novuApiKey!);

export default novu;
