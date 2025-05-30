import { Novu } from '@novu/api';
import { SubscriberPayloadDto } from '@novu/api/models/components/subscriberpayloaddto';

const novu = new Novu({
  secretKey: process.env['NOVU_SECRET_KEY'],
});

export async function triggerWorkflow(
  workflowId: string,
  subscriber: SubscriberPayloadDto,
  payload: object,
) {
  try {
    console.log('Payload:', payload, 'Triggering workflow:', workflowId, 'Subscriber:', subscriber);
    await novu.trigger({
      workflowId,
      to: subscriber,
      payload,
    });
    return new Response('Notification triggered', { status: 200 });
  } catch (error) {
    console.error('Error triggering notification workflow:', error);
    return new Response('Error triggering notification', { status: 500 });
  }
}
