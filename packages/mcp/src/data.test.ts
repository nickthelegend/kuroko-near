import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {vaultState} from './data.js';

test('vault tool refuses to invent a contract when account is missing',async()=>{
  await assert.rejects(vaultState(''),/Setup required: VAULT_ACCOUNT/);
});
