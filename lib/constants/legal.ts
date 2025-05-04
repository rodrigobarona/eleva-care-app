/**
 * Array of valid legal document types supported by the application
 * Used by both middleware.ts and legal document page components
 */
export const LEGAL_DOCUMENTS = ['terms', 'privacy', 'cookie', 'dpa'] as const;
export type LegalDocumentType = (typeof LEGAL_DOCUMENTS)[number];
