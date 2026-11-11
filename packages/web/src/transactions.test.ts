import {test} from 'node:test';
import assert from 'node:assert/strict';
import {confirmedHash} from './transactions.js';

test('a final success cannot hide a failed withdrawal receipt',()=>{
 assert.throws(()=>confirmedHash({status:{SuccessValue:''},transaction:{hash:'fixture'},receipts_outcome:[{outcome:{status:{Failure:{}}}}]}),/did not complete/);
});
test('a refunded NEP-141 transfer cannot be reported as a deposit',()=>{
 assert.throws(()=>confirmedHash({status:{SuccessValue:btoa('"0"')},transaction:{hash:'fixture'}},'10000'),/did not accept/);
 assert.equal(confirmedHash({status:{SuccessValue:btoa('"10000"')},transaction:{hash:'fixture'}},'10000'),'fixture');
});
test('pending and incomplete wallet responses never display confirmation',()=>{
 assert.throws(()=>confirmedHash(undefined),/no transaction result/);
 assert.throws(()=>confirmedHash({status:'Started'}),/pending/);
 assert.throws(()=>confirmedHash({status:{SuccessValue:''}}),/no transaction hash/);
});
