/**
 * Novu Integration Module
 *
 * Provides a unified interface for Novu notifications, email service,
 * and workflow triggers.
 */

// Email service exports
export * from './email-service';

// Utils exports (excluding triggerNovuWorkflow which is already exported from email-service)
export { initializeNovuClient, shouldSendNotification } from './utils';
