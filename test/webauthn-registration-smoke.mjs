import assert from 'node:assert/strict';
import { createRegistrationOptions } from '../src/webauthn.mjs';

const calls = [];
const supabase = {
  from(table) {
    return {
      select(columns) {
        calls.push(['select', table, columns]);
        return this;
      },
      eq(column, value) {
        calls.push(['eq', column, value]);
        return this;
      },
      async then(resolve) {
        return resolve({ data: [], error: null });
      },
      async insert(row) {
        calls.push(['insert', table, row]);
        return { error: null };
      }
    };
  }
};

const result = await createRegistrationOptions({
  supabase,
  ownerId: '11111111-1111-4111-8111-111111111111',
  deviceId: '0123456789abcdef',
  userName: 'student@example.com'
});

assert.equal(typeof result.challengeId, 'string');
assert.equal(typeof result.options.challenge, 'string');
assert.equal(result.options.rp.id, 'choi-bujang-secret-vault-rust.vercel.app');
assert.ok(calls.some(([kind, table]) =>
  kind === 'insert' && table === 'webauthn_challenges'
));

console.log('Registration options mock test passed.');
