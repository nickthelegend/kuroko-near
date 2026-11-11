// Bounded testnet round trip on the existing vault. Credentials are loaded by file path only.
// node scripts/qa-testnet.mjs /absolute/path/to/new-qa-report.json
// No deploy, account creation, wrapping, swap, vote, or mainnet call is performed.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {Account,KeyPair,KeyPairSigner,JsonRpcProvider,actions,teraToGas} from 'near-api-js';

const output=process.argv[2];
if(!output||!output.startsWith('/')||existsSync(output))throw Error('Supply a new absolute report path; existing reports are never overwritten.');
const live=JSON.parse(readFileSync(new URL('../deployments/testnet-live.json',import.meta.url),'utf8'));
if(live.network!=='testnet'||live.rpcUrl!=='https://test.rpc.fastnear.com'||![live.vault,live.lp].every(a=>a.endsWith('.testnet')))throw Error('Only the recorded NEAR testnet vault and depositor are allowed.');
const provider=new JsonRpcProvider({url:live.rpcUrl});
const CAP=300000000000000000000000n; // 0.3 NEAR for this QA run
const GAS=100000000000000n; // 100 Tgas per transaction, including downstream receipts
const report={network:'testnet',vault:live.vault,depositor:live.lp,capYocto:CAP.toString(),steps:[],startedAt:new Date().toISOString()};
const save=()=>writeFileSync(resolve(output),JSON.stringify(report,null,2)+'\n');
async function view(account_id,method_name,args={}){
 const r=await provider.query({request_type:'call_function',finality:'final',account_id,method_name,args_base64:Buffer.from(JSON.stringify(args)).toString('base64')});
 return JSON.parse(Buffer.from(r.result).toString());
}
async function balance(account_id){return provider.query({request_type:'view_account',finality:'final',account_id});}
async function snapshot(){return {state:await view(live.vault,'state'),shares:await view(live.vault,'shares_of',{account_id:live.lp}),usdc:await view(live.usdc,'ft_balance_of',{account_id:live.lp}),lp:await balance(live.lp),vault:await balance(live.vault)};}
const before=await snapshot();report.before=before;
const proposals=await view(live.vault,'proposals');
if(before.state.paused||proposals.some(p=>!p.executed&&p.closes_at_ms>Date.now()))throw Error('Skip: vault paused or vote open.');
const gasPrice=BigInt((await provider.sendJsonRpc('gas_price',[null])).gas_price);
const reserve=GAS*gasPrice*2n+2n;
if(reserve>CAP)throw Error('Skip: worst-case gas reservation exceeds the 0.3 NEAR budget.');
const lpAvailable=BigInt(before.lp.amount)-BigInt(before.lp.storage_usage)*10000000000000000000n;
const vaultAvailable=BigInt(before.vault.amount)-BigInt(before.vault.storage_usage)*10000000000000000000n;
if(lpAvailable<reserve||vaultAvailable<10000000000000000000000n)throw Error('Skip: balances are too low for a bounded round trip.');
const amount=10000n; // 0.01 USDC
if(BigInt(before.usdc)<amount)throw Error('Skip: depositor needs 0.01 testnet USDC.');
const minted=BigInt(before.state.total_shares)===0n?amount:amount*BigInt(before.state.total_shares)/BigInt(before.state.usdc_balance);
if(minted===0n)throw Error('Skip: deposit would mint zero shares.');
report.worstCaseGasYocto=reserve.toString();save();
// Only this dedicated testnet credential is read. Never log it or errors containing signer objects.
let account;
try{
const credential=JSON.parse(readFileSync(new URL(`../.near-credentials/${live.lp}.json`,import.meta.url),'utf8'));
if(credential.account_id!==live.lp)throw Error('Credential account does not match the recorded testnet depositor.');
account=new Account(live.lp,provider,new KeyPairSigner(KeyPair.fromString(credential.secret_key)));
}catch{console.error('Could not load the dedicated testnet signer. No key details are printed.');process.exit(1);}
let spent=0n;
async function send(receiverId,method,args,deposit,label){
 const r=await account.signAndSendTransaction({receiverId,actions:[actions.functionCall(method,args,teraToGas('100'),BigInt(deposit))],throwOnFailure:false,waitUntil:'FINAL'});
 const outcomes=[r.transaction_outcome,...r.receipts_outcome];
 const burned=outcomes.reduce((n,o)=>n+BigInt(o.outcome.tokens_burnt),0n);spent+=burned+BigInt(deposit);
 report.steps.push({label,hash:r.transaction.hash,explorer:`https://testnet.nearblocks.io/txns/${r.transaction.hash}`,burnedYocto:burned.toString(),attachedYocto:deposit,receiptFailures:outcomes.filter(o=>typeof o.outcome.status==='object'&&'Failure' in o.outcome.status).length});save();
 if(spent>CAP)throw Error('QA budget exceeded; no further transaction will be sent.');
 if(report.steps.at(-1).receiptFailures)throw Error('A receipt failed; inspect the public transaction link.');
 console.log(`${label}: ${r.transaction.hash}`);
}
try{
 await send(live.usdc,'ft_transfer_call',{receiver_id:live.vault,amount:amount.toString(),msg:''},'1','qa deposit 0.01 USDC');
 const afterDeposit=await snapshot();report.afterDeposit=afterDeposit;save();
 if(BigInt(afterDeposit.shares)!==BigInt(before.shares)+minted||BigInt(afterDeposit.usdc)!==BigInt(before.usdc)-amount)throw Error('Deposit balances did not reconcile.');
 if(spent+GAS*gasPrice+1n>CAP)throw Error('Skip withdrawal: remaining budget is too low.');
 await send(live.vault,'withdraw',{shares:minted.toString()},'0','qa withdraw minted shares');
 report.after=await snapshot();report.spentYocto=spent.toString();
 const returned=BigInt(report.afterDeposit.state.usdc_balance)*minted/BigInt(report.afterDeposit.state.total_shares);
 report.reconciled=report.after.shares===before.shares&&BigInt(report.after.usdc)===BigInt(before.usdc)-amount+returned&&BigInt(report.after.state.usdc_balance)===BigInt(before.state.usdc_balance)+amount-returned;
 if(!report.reconciled)throw Error('Withdrawal balances did not reconcile.');
 report.finishedAt=new Date().toISOString();save();console.log(JSON.stringify({reconciled:true,spentYocto:report.spentYocto,report:output}));
}catch{
 report.failed=true;report.spentYocto=spent.toString();save();console.error('QA stopped. Inspect the public report and transaction receipts; signer details are intentionally omitted.');process.exitCode=1;
}
