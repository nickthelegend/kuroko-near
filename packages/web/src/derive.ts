import type {History} from './activity';
import type {VaultState} from './rpc';
import {sharePrice} from './rpc';
import type {Pt} from './ui';

export const usd=(raw:string|bigint|null|undefined)=>raw==null?null:Number(BigInt(raw))/1e6;
export const priceNum=(s?:VaultState)=>s?Number(sharePrice(s.usdc_balance,s.total_shares))/1e6:null;
/** Deposits over time, from replayed NEP-141 transfers. */
export const cashPoints=(h?:History):Pt[]=>h?h.points.map(p=>({t:p.at,v:Number(p.cash)/1e6})):[];
export const pricePoints=(h?:History):Pt[]=>h?h.points.map(p=>({t:p.at,v:Number(p.price)/1e6})):[];
/** Sum of several vaults' deposit curves on one time axis. */
export function totalPoints(hs:(History|undefined)[]):Pt[]{
  const evs:{t:number;i:number;v:number}[]=[];
  hs.forEach((h,i)=>h?.points.forEach(p=>evs.push({t:p.at,i,v:Number(p.cash)/1e6})));
  evs.sort((a,b)=>a.t-b.t);
  const cur=hs.map(()=>0);const out:Pt[]=[];
  for(const e of evs){cur[e.i]=e.v;out.push({t:e.t,v:cur.reduce((a,b)=>a+b,0)});}
  return out;
}
export const pairList=(s?:VaultState)=>s?.constitution.allowed_pairs??[];
export const bps=(n:number)=>`${(n/100).toFixed(2)}%`;
export function statusOf(s:VaultState|undefined,locked:boolean,err:boolean){
  if(!s)return err?{label:'Unavailable',tone:'bad' as const}:{label:'Loading',tone:'off' as const};
  if(s.paused)return {label:'Paused',tone:'bad' as const};
  if(locked)return {label:'Locked for a vote',tone:'warn' as const};
  return {label:'Open',tone:'ok' as const};
}
export function sharesFor(amountRaw:bigint,s:VaultState){const shares=BigInt(s.total_shares),cash=BigInt(s.usdc_balance);return shares===0n?amountRaw:amountRaw*shares/(cash||1n);}
export function usdcFor(sharesRaw:bigint,s:VaultState){const shares=BigInt(s.total_shares),cash=BigInt(s.usdc_balance);return shares===0n?0n:sharesRaw*cash/shares;}
