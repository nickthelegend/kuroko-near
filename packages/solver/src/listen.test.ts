import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {spawnSync} from 'node:child_process';
test('listen mode requires an authenticated relay credential',()=>{
  const env={...process.env}; delete env.PARTNER_JWT;
  const result=spawnSync(process.execPath,['--import','tsx','src/listen.ts'],{env,encoding:'utf8',timeout:10000});
  assert.equal(result.status,2);
  assert.match(result.stderr,/Setup required: PARTNER_JWT/);
});
