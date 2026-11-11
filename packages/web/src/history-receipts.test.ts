import {test} from 'node:test';
import assert from 'node:assert/strict';
import {uniqueReceipts,type FullTx,type Receipt} from './history-receipts.js';
const transfer=(id:string,amount:string):Receipt=>({receipt:{receipt_id:id,receiver_id:'token.testnet',block_timestamp:1},execution_outcome:{outcome:{status:{SuccessValue:''},logs:[JSON.stringify({event:'ft_transfer',amount})]}}});
const tx=(receipts:Receipt[]):FullTx=>({transaction:{hash:'transaction',signer_id:'lp.testnet',receiver_id:'token.testnet',actions:[]},receipts});

test('overlapping FastNEAR snapshots cannot quadruple a single real deposit',()=>{
 const receipt=transfer('deposit-receipt','10000');
 const result=uniqueReceipts([tx([receipt,receipt]),tx([receipt]),tx([receipt])]);
 assert.equal(result.length,1);
 assert.equal(result.reduce((sum,r)=>sum+BigInt(JSON.parse(r.receipt.execution_outcome.outcome.logs[0]).amount),0n),10000n);
});
test('deduplication preserves distinct transfers and excludes failed receipt logs',()=>{
 const first=transfer('first','10000'),second=transfer('second','10000'),failed=transfer('failed','999999');
 failed.execution_outcome.outcome.status={Failure:{}};
 assert.deepEqual(uniqueReceipts([tx([first]),tx([first,second,failed])]).map(r=>r.receipt.receipt.receipt_id),['first','second']);
});
