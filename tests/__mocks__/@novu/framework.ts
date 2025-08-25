// Mock for @novu/framework
type WorkflowHandler = (...args: unknown[]) => unknown;

export const workflow = jest.fn((workflowId: string, handler: WorkflowHandler) => ({
  workflowId,
  handler,
  trigger: jest.fn().mockResolvedValue({ success: true }),
}));

export const serve = jest.fn().mockReturnValue({
  handler: jest.fn(),
  GET: jest.fn(),
  POST: jest.fn(),
  OPTIONS: jest.fn(),
});

// Mock workflow step functions
export const step = {
  email: jest.fn().mockImplementation(() => ({
    stepId: 'email-step',
    handler: jest.fn(),
  })),
  inApp: jest.fn().mockImplementation(() => ({
    stepId: 'inApp-step',
    handler: jest.fn(),
  })),
  sms: jest.fn().mockImplementation(() => ({
    stepId: 'sms-step',
    handler: jest.fn(),
  })),
  push: jest.fn().mockImplementation(() => ({
    stepId: 'push-step',
    handler: jest.fn(),
  })),
  digest: jest.fn().mockImplementation(() => ({
    stepId: 'digest-step',
    handler: jest.fn(),
  })),
  delay: jest.fn().mockImplementation(() => ({
    stepId: 'delay-step',
    handler: jest.fn(),
  })),
  custom: jest.fn().mockImplementation(() => ({
    stepId: 'custom-step',
    handler: jest.fn(),
  })),
};

// Mock workflow payload and context
export const mockWorkflowPayload = {
  payload: {},
  step,
};

export const mockWorkflowContext = {
  payload: {},
  subscriber: {
    subscriberId: 'test-subscriber',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
  },
};
