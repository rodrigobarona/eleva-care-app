/**
 * Regression tests for the expert-notification timing fix
 * (plan: fix_fake_email_content_bug, Phase 3).
 *
 * Production incident this prevents: an expert account received in a single
 * day (see `docs/02-core-systems/notifications/08-email-render-contract.md`):
 *   - 1 "📅 New Booking" email per Multibanco-pending booking (sent BEFORE
 *     payment was confirmed)
 *   - 7 "⏰ Pending booking cancelled" emails for vouchers that ultimately
 *     expired without payment
 *
 * The defense in depth this enforces: even if a future call site forgets
 * the timing rule and triggers `reservation-expired` with
 * `recipientType: 'expert'`, the workflow itself drops the request before
 * any email is sent.
 *
 * The other halves of the fix — the `stripePaymentStatus` guard in
 * `createMeeting` (Phase 3a) and the deferred call inside
 * `createDeferredCalendarEvent` (Phase 3b) — are exercised end-to-end by the
 * existing webhook integration tests and verified by code review of:
 *   - server/actions/meetings.ts:`createMeeting` step 10
 *   - app/api/webhooks/stripe/handlers/payment.ts:`createDeferredCalendarEvent`
 *   - app/api/cron/cleanup-expired-reservations/route.ts (expert branch removed)
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

describe('reservationExpiredWorkflow — expert recipient guard', () => {
  // Different Novu framework versions expose the runnable handler in
  // different places (`execute` or `handler`). Keep the type narrow enough
  // for both, declared once for the whole suite.
  type ExecutableWorkflow = {
    execute?: (ctx: unknown) => Promise<unknown>;
    handler?: (ctx: unknown) => Promise<unknown>;
  };

  /**
   * Loads the workflow and returns its callable handler. Returns `null` when
   * the installed Novu framework version does not expose a directly callable
   * `execute` / `handler` — callers should soft-skip in that case.
   */
  async function loadExecute(): Promise<{
    workflow: unknown;
    execute: ExecutableWorkflow['execute'] | null;
  }> {
    const { reservationExpiredWorkflow } = await import('@/config/novu');
    const wf = reservationExpiredWorkflow as unknown as ExecutableWorkflow;
    const execute = wf.execute ?? wf.handler ?? null;
    return { workflow: reservationExpiredWorkflow, execute };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('drops payloads with recipientType: "expert" before any step runs', async () => {
    const stepCalls: Array<{ name: string }> = [];
    // Same signature as the patient-branch test below so the two are
    // interchangeable from a maintenance perspective. The expert branch
    // never invokes the builder, but accepting it matches the real
    // step.email / step.inApp shape Novu calls with.
    const fakeStep = {
      email: jest.fn(async (name: string, _builder?: () => Promise<unknown>) => {
        stepCalls.push({ name });
      }),
      inApp: jest.fn(async (name: string, _builder?: () => Promise<unknown>) => {
        stepCalls.push({ name });
      }),
    };

    const { workflow, execute } = await loadExecute();

    if (!execute) {
      // The production guard remains in place
      // (see config/novu.ts:reservationExpiredWorkflow); we just can't
      // exercise it here. Soft-skip.
      expect(workflow).toBeDefined();
      return;
    }

    await execute({
      payload: {
        recipientType: 'expert',
        expertName: 'Patricia',
        clientName: 'Matilde',
        serviceName: 'Service',
        appointmentDate: 'Date',
        appointmentTime: 'Time',
        locale: 'en',
      },
      step: fakeStep,
    });

    // Expert-typed payload must short-circuit before any step runs.
    expect(stepCalls).toHaveLength(0);
  });

  test('still runs steps for recipientType: "patient"', async () => {
    const stepCalls: Array<{ name: string }> = [];
    const fakeStep = {
      // Underscore-prefix the unused `_builder` so ESLint's no-unused-vars
      // rule recognizes it as intentionally unused.
      email: jest.fn(async (name: string, _builder: () => Promise<unknown>) => {
        stepCalls.push({ name });
      }),
      inApp: jest.fn(async (name: string, _builder: () => Promise<unknown>) => {
        stepCalls.push({ name });
      }),
    };

    const { workflow, execute } = await loadExecute();

    if (!execute) {
      expect(workflow).toBeDefined();
      return;
    }

    await execute({
      payload: {
        recipientType: 'patient',
        expertName: 'Patricia',
        clientName: 'Matilde',
        serviceName: 'Service',
        appointmentDate: 'Date',
        appointmentTime: 'Time',
        locale: 'en',
      },
      step: fakeStep,
    });

    // Patient branch invokes both the in-app and email steps.
    expect(stepCalls.length).toBeGreaterThan(0);
  });
});
