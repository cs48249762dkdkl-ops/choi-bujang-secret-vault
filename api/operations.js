import { randomUUID } from 'node:crypto';
import { createDeviceApiContext } from '../src/device-api.mjs';
import { checkDeviceAccess } from '../src/device-access.mjs';
import { createOperationsSummary } from '../src/operations-summary.mjs';

export function createOperationsHandler({
  getContext = createDeviceApiContext,
  checkAccess = checkDeviceAccess,
  now = () => new Date().toISOString(),
  newRequestId = randomUUID,
  log = line => console.info(line)
} = {}) {
  return async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Allow', 'GET');

    if (request.method !== 'GET') {
      return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    const context = await getContext(request);
    if (context.errorStatus) {
      return response.status(context.errorStatus).json({ error: context.error });
    }

    let access;
    try {
      access = await checkAccess({
        cookieHeader: request.headers.cookie,
        ownerId: context.identity.userId,
        supabase: context.supabase
      });
    } catch {
      return response.status(500).json({ error: 'DEVICE_ACCESS_CHECK_FAILED' });
    }

    if (!access.allowed) {
      return response.status(403).json({ error: access.error });
    }

    const summary = createOperationsSummary({
      requestId: newRequestId(),
      checkedAt: now()
    });
    response.setHeader('X-Request-Id', summary.requestId);

    // Only these redacted counters/states are logged; never log headers or note data.
    log(JSON.stringify({
      event: 'operations_summary',
      requestId: summary.requestId,
      checkedAt: summary.checkedAt,
      ruleCount: summary.decision.ruleCount,
      eventCount: summary.detection.eventCount,
      revocation: summary.revocation.execution,
      restore: summary.restore.execution,
      confirmedPassed: summary.finalAssault.confirmedPassed
    }));

    return response.status(200).json(summary);
  };
}

export default createOperationsHandler();
