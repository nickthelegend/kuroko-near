import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkQaNetwork,qaReservation,QA_RPC,QA_RPCS,QA_GAS,QA_CAP} from './qa-signer-policy.js';

test('QA signer refuses mainnet RPCs and non-testnet signer/vault accounts',()=>{
 for(const r of QA_RPCS)assert.doesNotThrow(()=>checkQaNetwork('demo.testnet',r,'vault.testnet'));
 for(const [a,r,v] of [['demo.near',QA_RPC,'vault.testnet'],['demo.testnet','https://rpc.mainnet.near.org','vault.testnet'],['demo.testnet',QA_RPC,'vault.near'],['BAD.testnet',QA_RPC,'vault.testnet']])assert.throws(()=>checkQaNetwork(a,r,v),/named testnet/);
});
test('QA signer rejects excessive gas, deposits and fees before signing',()=>{
 assert.ok(qaReservation(QA_GAS,1n,100000000n)<QA_CAP);
 assert.throws(()=>qaReservation(QA_GAS+1n,0n,1n),/bounded/);
 assert.throws(()=>qaReservation(QA_GAS,2n,1n),/bounded/);
 assert.throws(()=>qaReservation(QA_GAS,0n,QA_CAP),/cap/);
});
