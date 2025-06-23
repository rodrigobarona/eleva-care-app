export class Webhook {
  constructor(private secret: string) {}

  verify(payload: string, _headers: Record<string, string>): Record<string, unknown> {
    // Mock implementation that returns a parsed event
    try {
      return JSON.parse(payload);
    } catch {
      throw new Error('Invalid payload');
    }
  }
}

export default Webhook;
