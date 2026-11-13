/** QA-only browser signer. Never stores credentials in browser storage or a build artifact. */
import {connect,keyStores,KeyPair,transactions,providers,utils} from 'near-api-js';
import type {AppWallet,WalletLayer} from './wallet-layer';
import {vaultId,usdcId,liveRecord} from './rpc';
import {checkQaNetwork,qaReservation,QA_RPCS,QA_READ_RPCS,QA_CAP} from './qa-signer-policy';
import {VAULTS} from './vaults';

type Input={accountId:string;secretKey:string;rpcUrl:string};
type Reservation={receiverId:string;methods:string[];reservedYocto:string};
declare global{
  interface Window{
    __KUROKO_QA_SIGNER_INPUT?:Input;
    __KUROKO_QA_RESERVE?:(request:Reservation)=>Promise<string>;
    __KUROKO_QA_RECEIPT?:(ticket:string,hash:string)=>Promise<void>;
  }
}
export async function setupQaSigner():Promise<WalletLayer>{
  const input=window.__KUROKO_QA_SIGNER_INPUT;
  delete window.__KUROKO_QA_SIGNER_INPUT;
  if(!input||!window.__KUROKO_QA_RESERVE||!window.__KUROKO_QA_RECEIPT)throw Error('QA signer requires the end-to-end test runner.');
  checkQaNetwork(input.accountId,input.rpcUrl,vaultId);
  const QA_RPC=input.rpcUrl;
  if(input.accountId!==liveRecord.lp||!QA_RPCS.includes(QA_RPC))throw Error('QA signer only supports the recorded testnet demo account.');
  const accountId=input.accountId;
  const keyStore=new keyStores.InMemoryKeyStore();
  try{if(!/^ed25519:[1-9A-HJ-NP-Za-km-z]+$/.test(input.secretKey))throw Error('format');await keyStore.setKey('testnet',accountId,KeyPair.fromString(input.secretKey as `ed25519:${string}`));}
  catch{throw Error('QA signer could not load the injected testnet credential.');}
  finally{input.secretKey='';}
  const near=await connect({networkId:'testnet',nodeUrl:QA_RPC,keyStore});
  const account=await near.account(accountId);
  const provider=new providers.JsonRpcProvider({url:QA_RPC});
  let connected=false,usedReservation=0n,pending=false;
  const getAccounts=async()=>connected?[{accountId}]:[];
  const signAndSendTransaction:AppWallet['signAndSendTransaction']=async({receiverId,actions,signerId})=>{
    if(!connected||pending)throw Error('Connect the QA signer and wait for the current transaction.');
    if((signerId&&signerId!==accountId)||![...VAULTS.map(v=>v.id),usdcId].includes(receiverId??'')||!actions.length)throw Error('QA signer refuses this transaction target.');
    pending=true;
    try{
      let gas=0n,deposit=0n;
      const calls=actions.map(action=>{
        if(action.enum!=='functionCall'||!action.functionCall)throw Error('QA signer only supports function-call actions.');
        const a=action.functionCall;gas+=BigInt(a.gas.toString());deposit+=BigInt(a.deposit.toString());
        return transactions.functionCall(a.methodName,a.args,BigInt(a.gas.toString()),BigInt(a.deposit.toString()));
      });
      let gas_price='';
      for(let i=0;i<8&&!gas_price;i++){try{gas_price=(await new providers.JsonRpcProvider({url:QA_READ_RPCS[i%QA_READ_RPCS.length]}).sendJsonRpc('gas_price',[null]) as {gas_price:string}).gas_price;}catch{await new Promise(r=>setTimeout(r,1200));}}
      if(!gas_price)throw Error('QA signer could not read the gas price.');
      const reserved=qaReservation(gas,deposit,BigInt(gas_price));
      if(usedReservation+reserved>QA_CAP)throw Error('QA signer reached the 0.3 NEAR session cap.');
      const ticket=await window.__KUROKO_QA_RESERVE!({receiverId:receiverId!,methods:calls.map(a=>a.functionCall!.methodName),reservedYocto:reserved.toString()});
      usedReservation+=reserved;
      // Sign once, then broadcast the same signed bytes until an approved RPC accepts them. Re-sending an identical
      // signed transaction cannot execute twice (same hash, same nonce), so a rate-limited broadcast is safe to retry.
      let signed;
      for(let i=0;i<5&&!signed;i++){
        try{signed=await (account as unknown as {signTransaction:(r:string,a:typeof calls)=>Promise<[Uint8Array,Parameters<providers.JsonRpcProvider['sendTransactionAsync']>[0]]>}).signTransaction(receiverId!,calls);}
        catch{await new Promise(r=>setTimeout(r,1500+700*i));}
      }
      if(!signed)throw Error('QA signer could not sign this transaction (nonce or access key lookup failed). Nothing was sent.');
      const hash=utils.serialize.base_encode(signed[0]);
      let accepted=false;
      for(let i=0;i<10&&!accepted;i++){
        try{await new providers.JsonRpcProvider({url:QA_RPCS[i%QA_RPCS.length]}).sendTransactionAsync(signed[1]);accepted=true;}
        catch{await new Promise(r=>setTimeout(r,1500+500*i));}
      }
      if(!accepted)throw Error('QA signer submission did not return a receipt. The budget remains reserved; do not retry blindly.');
      await window.__KUROKO_QA_RECEIPT!(ticket,hash);
      // near-api-js 5 submits optimistically. Do not let the app confirm until finality.
      // Public testnet RPCs rate-limit per IP; poll the approved endpoints in turn until the transaction is final.
      let final;
      for(let i=0;i<8&&!final;i++){try{final=await new providers.JsonRpcProvider({url:QA_READ_RPCS[(QA_READ_RPCS.indexOf(QA_RPC)+i)%QA_READ_RPCS.length]}).txStatus(hash,accountId,'FINAL');}catch{await new Promise(r=>setTimeout(r,1500));}}
      if(!final)throw Error('QA signer could not read the final receipt.');
      return final as Awaited<ReturnType<AppWallet['signAndSendTransaction']>>;
    }catch(e){
      if(e instanceof Error&&e.message.startsWith('QA signer'))throw e;
      console.warn('QA signer step failed:',(e as Error)?.message?.slice(0,160));
      throw Error('QA signer could not complete this testnet transaction. Check the recorded receipt.');
    }finally{pending=false;}
  };
  const wallet:AppWallet={
    getAccounts,
    signIn:async({contractId})=>{if(contractId!==vaultId)throw Error('QA signer refuses this sign-in contract.');connected=true;return getAccounts();},
    signOut:async()=>{connected=false;},
    signAndSendTransaction,
    signAndSendTransactions:async({transactions:batch})=>{const results=[];for(const tx of batch)results.push(await signAndSendTransaction(tx));return results;},
  };
  return {isSignedIn:()=>connected,wallet:async()=>wallet};
}
