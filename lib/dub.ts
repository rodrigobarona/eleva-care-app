/**
 * Dub.co link shortening utilities for Eleva Care
 * Integrates with the go.eleva.care custom domain
 */

'use server';

import { z } from 'zod';

/**
 * Dub.co link shortening utilities for Eleva Care
 * Integrates with the go.eleva.care custom domain
 */

/**
 * Dub.co link shortening utilities for Eleva Care
 * Integrates with the go.eleva.care custom domain
 */

/**
 * Dub.co link shortening utilities for Eleva Care
 * Integrates with the go.eleva.care custom domain
 */

/**
 * Dub.co link shortening utilities for Eleva Care
 * Integrates with the go.eleva.care custom domain
 */

/**
 * Dub.co link shortening utilities for Eleva Care
 * Integrates with the go.eleva.care custom domain
 */

/**
 * Dub.co link shortening utilities for Eleva Care
 * Integrates with the go.eleva.care custom domain
 */

/**
 * Dub.co link shortening utilities for Eleva Care
 * Integrates with the go.eleva.care custom domain
 */

/**
 * Dub.co link shortening utilities
 */

/**
 * Dub.co link shortening utilities
 */

/**
 * Dub.co link shortening utilities
 */

/**
 * Dub.co link shortening utilities
 */

/**
 * Dub.co link shortening utilities
 */

const DUB_API_KEY = process.env.DUB_API_KEY;
const DUB_API_ENDPOINT = process.env.DUB_API_ENDPOINT || 'https://api.dub.co/links';
const DUB_DEFAULT_DOMAIN = process.env.DUB_DEFAULT_DOMAIN || 'go.eleva.care';

// Schema for Dub.co API response
const DubResponseSchema = z.object({
  id: z.string(),
  domain: z.string(),
  key: z.string(),
  url: z.string(),
  archived: z.boolean(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  shortLink: z.string(),
});

// Type is inferred in the parse method directly

interface CreateShortLinkOptions {
  url: string;
  expertName?: string;
  expertUsername?: string;
  customDomain?: string;
  customSlug?: string;
}

/**
 * Creates a shortened URL for Google Meet links with tracking parameters
 *
 * @param options Options for creating the short link
 * @returns The shortened URL or the original URL if shortening fails
 */
export async function createShortMeetLink(options: CreateShortLinkOptions): Promise<string> {
  const { url, expertName, expertUsername, customDomain, customSlug } = options;

  if (!url || !url.includes('meet.google.com')) {
    console.warn('Not a valid Google Meet URL:', url);
    return url;
  }

  if (!DUB_API_KEY) {
    console.warn('DUB_API_KEY not configured, returning original URL');
    return url;
  }

  // Clean expert name for UTM campaign parameter
  const campaignName = expertName
    ? expertName.toLowerCase().replace(/[^a-z0-9]/g, '_')
    : 'expert_appointment';

  // Add UTM parameters to the URL
  const urlWithUtm = new URL(url);
  urlWithUtm.searchParams.append('utm_source', 'eleva_care');
  urlWithUtm.searchParams.append('utm_medium', 'calendar_invite');
  urlWithUtm.searchParams.append('utm_campaign', campaignName);

  // Add expert's username if available
  if (expertUsername) {
    urlWithUtm.searchParams.append('utm_content', expertUsername);
  }

  try {
    console.log('Creating short link for Google Meet URL:', urlWithUtm.toString());

    const response = await fetch(DUB_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DUB_API_KEY}`,
      },
      body: JSON.stringify({
        url: urlWithUtm.toString(),
        domain: customDomain || DUB_DEFAULT_DOMAIN,
        key: customSlug || undefined,
        // Additional options can be added here
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dub.co API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const parsedData = DubResponseSchema.parse(data);

    console.log('Successfully created short link:', parsedData.shortLink);
    return parsedData.shortLink;
  } catch (error) {
    console.error('Error creating short link with Dub.co:', error);
    // Fallback to the original URL with UTM parameters
    return urlWithUtm.toString();
  }
}
