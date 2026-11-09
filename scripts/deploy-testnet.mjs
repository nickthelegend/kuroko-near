import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {Account,KeyPair,KeyPairSigner,JsonRpcProvider,PublicKey,actions,teraToGas,nearToYocto} from 'near-api-js';

const rpcUrl='https://test.rpc.fastnear.com';
const tokenId='usdc.testnet';
const suffix=randomBytes(4).toString('hex');
const parentFile=process.env.KUROKO_TESTNET_PARENT_KEY_FILE;
const parentCredentials=parentFile?JSON.parse(readFileSync(parentFile,'utf8')):null;
const accountId=parentCredentials?`kuroko-${suffix}.${parentCredentials.account_id}`:`kuroko-vault-${suffix}.testnet`;
const key=KeyPair.fromRandom('ed25519');
const wasm=readFileSync(new URL('../packages/contract/target/near/kuroko_vault.wasm',import.meta.url));
mkdirSync(new URL('../.near-credentials/',import.meta.url),{recursive:true,mode:0o700});
const keyFile=new URL(`../.near-credentials/${accountId}.json`,import.meta.url);
writeFileSync(keyFile,JSON.stringify({account_id:accountId,secret_key:key.toString()}),{mode:0o600,flag:'wx'});
const provider=new JsonRpcProvider({url:rpcUrl});
if(parentCredentials){
 const parent=new Account(parentCredentials.account_id,provider,new KeyPairSigner(KeyPair.fromString(parentCredentials.secret_key)));
 const created=await parent.signAndSendTransaction({receiverId:accountId,actions:[actions.createAccount(),actions.transfer(nearToYocto('3')),actions.addFullAccessKey(PublicKey.fromString(key.getPublicKey().toString()))],throwOnFailure:false,waitUntil:'FINAL'});
 if('Failure' in created.status)throw Error(`subaccount creation failed: ${JSON.stringify(created.status.Failure)}`);
}else{
 const helper=await fetch('https://helper.nearprotocol.com/account',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({newAccountId:accountId,newAccountPublicKey:key.getPublicKey().toString()})});
 if(!helper.ok)throw Error(`testnet account helper HTTP ${helper.status}: ${(await helper.text()).slice(0,200)}`);
}
let ready=false;
for(let i=0;i<30;i++){try{await provider.query({request_type:'view_account',finality:'final',account_id:accountId});ready=true;break}catch{await new Promise(r=>setTimeout(r,1000))}}
if(!ready)throw Error('created account not visible on testnet after 30 seconds');
const account=new Account(accountId,provider,new KeyPairSigner(key));
const constitution={allowed_pairs:['nep141:usdc.testnet/nep141:wrap.testnet'],max_inventory_usdc:'1000000',min_spread_bps:30,daily_loss_limit_usdc:'100000'};
const result=await account.signAndSendTransaction({receiverId:accountId,actions:[actions.deployContract(wasm),actions.functionCall('new',{usdc:tokenId,operator:accountId,constitution},teraToGas('100'),0n)],throwOnFailure:false,waitUntil:'FINAL'});
if('Failure' in result.status)throw Error(`deployment failed: ${JSON.stringify(result.status.Failure)}`);
const args=Buffer.from('{}').toString('base64');
const view=await provider.query({request_type:'call_function',finality:'final',account_id:accountId,method_name:'state',args_base64:args});
const state=JSON.parse(Buffer.from(view.result).toString());
if(state.constitution.min_spread_bps!==30)throw Error('deployed state does not match constitution');
const output={network:'testnet',accountId,tokenId,txHash:result.transaction.hash,explorer:`https://testnet.nearblocks.io/txns/${result.transaction.hash}`,rpcUrl,wasmSha256:(await import('node:crypto')).createHash('sha256').update(wasm).digest('hex'),state,observedAt:new Date().toISOString()};
const date=new Date().toISOString().slice(0,10);
writeFileSync(new URL(`../deployments/testnet-${date}.json`,import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({accountId,txHash:output.txHash,explorer:output.explorer,observedAt:output.observedAt}));
