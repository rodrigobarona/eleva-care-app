// Manual mock for app/utils/novu.ts
// Mirror: app/utils/novu.ts exports

export const triggerWorkflow = jest.fn().mockResolvedValue({ success: true });

export const updateSubscriber = jest.fn().mockResolvedValue({ success: true });

export const getNovuStatus = jest.fn().mockReturnValue({
  initialized: true,
  initializationError: null,
  config: {
    hasSecretKey: true,
    hasApiKey: false,
    hasAppId: true,
    baseUrl: 'https://api.novu.co',
    socketUrl: undefined,
    adminSubscriberId: undefined,
    keyPrefix: 'novu-...',
  },
});

export const runNovuDiagnostics = jest.fn().mockResolvedValue({
  client: {
    initialized: true,
    initializationError: null,
  },
  workflows: [],
  errors: [],
  recommendations: [],
  summary: {
    healthy: true,
    criticalErrors: 0,
    warnings: 0,
  },
});

export const novu = {
  trigger: jest.fn().mockResolvedValue({ success: true }),
  subscribers: {
    create: jest.fn().mockResolvedValue({ success: true }),
  },
};
