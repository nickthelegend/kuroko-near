import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {quoteConstantProduct,quoteExactOut,evaluate} from './index.js';
const c = {allowed_pairs:['nep141:a/nep141:b'],max_inventory_usdc:'1000',min_spread_bps:30,daily_loss_limit_usdc:'100'};
test('constant product output uses integer reserves and spread',()=>assert.equal(quoteConstantProduct(100n,1000n,1000n,30),90n));
test('exact output rounds input up',()=>assert.equal(quoteExactOut(100n,1000n,1000n,30),112n));
test('pair outside constitution is refused',()=>assert.deepEqual(evaluate({quote_id:'1',defuse_asset_identifier_in:'nep141:b',defuse_asset_identifier_out:'nep141:a',exact_amount_in:'10',min_deadline_ms:1000},{'nep141:a':'1000','nep141:b':'1000'},c),{reason:'pair outside constitution'}));
test('missing inventory yields setup reason',()=>assert.match(JSON.stringify(evaluate({quote_id:'1',defuse_asset_identifier_in:'nep141:a',defuse_asset_identifier_out:'nep141:b',exact_amount_in:'10',min_deadline_ms:1000},{},c)),/Setup required/));
test('inventory cap refuses large quote',()=>assert.deepEqual(evaluate({quote_id:'1',defuse_asset_identifier_in:'nep141:a',defuse_asset_identifier_out:'nep141:b',exact_amount_in:'9000',min_deadline_ms:1000},{'nep141:a':'100000','nep141:b':'100000'},c),{reason:'inventory cap exceeded'}));
