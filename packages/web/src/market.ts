/**
 * Live reads that make the relay page honest and alive without a Partner JWT:
 * - the NEAR testnet chain head (one RPC call),
 * - a reachability probe of the public NEAR Intents solver relay JSON-RPC endpoint,
 * - a dry-run 1Click quote for USDC → wNEAR on mainnet (the market Kuroko's solver would quote into), plus 1Click's
 *   reference prices. Nothing here signs, sends or fills anything.
 */
import {rpcPost} from './rpc';
export const RELAY_RPC='https://solver-relay-v2.chaindefuser.com/rpc';
const ONECLICK='https://1click.chaindefuser.com/v0';
export const MAINNET_USDC='nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';
export const MAINNET_WNEAR='nep141:wrap.near';

export type Head={height:number;at:number};
export async function chainHead():Promise<Head>{
  const j=await rpcPost<{result?:{header?:{height:number;timestamp_nanosec?:string;timestamp:number}}}>({jsonrpc:'2.0',id:'head',method:'block',params:{finality:'final'}});
  const h=j?.result?.header;
  if(!h)throw Error('NEAR testnet RPC returned no block.');
  return {height:h.height,at:Math.round(Number(h.timestamp_nanosec??h.timestamp)/1e6)};
}

export type Probe={ok:boolean;ms:number;at:number;detail:string};
/** Sends a deliberately empty quote request: any JSON-RPC answer proves the relay is up. No asset or amount is sent. */
export async function probeRelay():Promise<Probe>{
  const t0=performance.now();
  try{
    const r=await fetch(RELAY_RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'kuroko-probe',method:'quote',params:[{}]}),signal:AbortSignal.timeout(10000)});
    const ms=Math.round(performance.now()-t0);
    const j=await r.json().catch(()=>null);
    if(j&&j.jsonrpc==='2.0')return {ok:true,ms,at:Date.now(),detail:`HTTP ${r.status}, JSON-RPC answered`};
    return {ok:false,ms,at:Date.now(),detail:`HTTP ${r.status}, unexpected body`};
  }catch{return {ok:false,ms:Math.round(performance.now()-t0),at:Date.now(),detail:'No answer within 10 s'};}
}

export type MarketQuote={amountIn:number;amountOut:number;usdIn:number;nearUsd:number;usdcUsd:number;at:number;quotedAt:string;spreadBps:number;ms:number};
type Token={assetId:string;price:number;symbol:string};
let prices:{at:number;nearUsd:number;usdcUsd:number}|null=null;
async function referencePrices(){
  if(prices&&Date.now()-prices.at<60_000)return prices;
  const r=await fetch(`${ONECLICK}/tokens`,{signal:AbortSignal.timeout(10000)}).catch(()=>{throw Error('1Click token prices are unreachable.');});
  if(!r.ok)throw Error(`1Click token prices HTTP ${r.status}`);
  const list=await r.json() as Token[];
  const near=list.find(t=>t.assetId===MAINNET_WNEAR)?.price,usdc=list.find(t=>t.assetId===MAINNET_USDC)?.price;
  if(!near||!usdc)throw Error('1Click returned no wNEAR or USDC price.');
  prices={at:Date.now(),nearUsd:near,usdcUsd:usdc};return prices;
}
/** A dry 1Click quote: real solver competition for 100 USDC → wNEAR on mainnet, with no deposit address and no funds. */
export async function marketQuote(usdc=100):Promise<MarketQuote>{
  const ref=await referencePrices();
  const t0=performance.now();
  const body={dry:true,swapType:'EXACT_INPUT',slippageTolerance:100,originAsset:MAINNET_USDC,depositType:'INTENTS',destinationAsset:MAINNET_WNEAR,
    amount:String(Math.round(usdc*1e6)),refundTo:'kuroko.near',refundType:'INTENTS',recipient:'kuroko.near',recipientType:'INTENTS',
    deadline:new Date(Date.now()+10*60_000).toISOString(),quoteWaitingTimeMs:2500};
  let r:Response;
  try{r=await fetch(`${ONECLICK}/quote`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});}
  catch{throw Error('1Click quote service is unreachable.');}
  const j=await r.json().catch(()=>null);
  if(!r.ok||!j?.quote)throw Error(j?.message?`1Click: ${j.message}`:`1Click quote HTTP ${r.status}`);
  const amountOut=Number(j.quote.amountOutFormatted);
  const fair=usdc*ref.usdcUsd/ref.nearUsd;
  return {amountIn:usdc,amountOut,usdIn:Number(j.quote.amountInUsd),nearUsd:ref.nearUsd,usdcUsd:ref.usdcUsd,at:Date.now(),quotedAt:j.timestamp,
    spreadBps:Math.round((1-amountOut/fair)*10000),ms:Math.round(performance.now()-t0)};
}
