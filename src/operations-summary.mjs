import { RULE_IDS } from './decider.mjs';

// This is a summary of checked-in behavior, not an ALEPH engine verdict.
export function createOperationsSummary({ requestId, checkedAt }) {
  return {
    schema: 'byteback.operations.v1',
    requestId,
    checkedAt,
    deviceAccess: { state: 'approved_verified', source: 'server_device_session' },
    decision: {
      source: 'checked_in_decider',
      ruleIds: [...RULE_IDS],
      ruleCount: RULE_IDS.length,
      execution: 'not_run'
    },
    detection: {
      source: 'checked_in_detector',
      eventCount: null,
      execution: 'not_run'
    },
    revocation: {
      source: 'aleph_engine',
      state: 'not_verified',
      execution: 'not_run'
    },
    restore: {
      source: 'checked_in_restore_route',
      version: null,
      configuredState: 'blocked',
      configuredReason: 'S10_BACKUP_UNVERIFIED',
      execution: 'not_run'
    },
    finalAssault: {
      expectedKinds: 41,
      confirmedPassed: null,
      execution: 'not_run'
    }
  };
}
