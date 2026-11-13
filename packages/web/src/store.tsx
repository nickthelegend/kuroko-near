import {createContext,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {loadHistory,type History,type VaultEvent} from './activity';
import {view,sharePrice,type VaultState,type Proposal} from './rpc';
import {chainHead,type Head} from './market';
import {VAULTS,type VaultMeta} from './vaults';
import type {Live} from './ui';

/**
 * One live store for every page. Contract state is polled every 4 s (a single view call per vault), history is rebuilt
 * from FastNEAR's transaction index every 25 s or as soon as a vault's state changes, and the chain head every 2 s.
 * Errors keep the last good value so nothing flashes empty.
 */
export type VaultLive={meta:VaultMeta;state:Live<VaultState>;history:Live<History>;proposals:Live<Proposal[]>;changedAt:number};
export type FeedEvent=VaultEvent&{vault:VaultMeta};
type Store={vaults:VaultLive[];head:Live<Head>;feed:FeedEvent[];feedReady:boolean;feedError?:string;refresh:()=>void;totals:{cash:bigint;depositors:number;txs:number;ready:boolean}};
const Ctx=createContext<Store|null>(null);

function usePoll<T>(load:()=>Promise<T>,every:number,kick:number):[Live<T>,number]{
  const [live,setLive]=useState<Live<T>>({state:'loading'});
  const [changed,setChanged]=useState(0);
  const last=useRef('');
  useEffect(()=>{
    let on=true;
    const run=()=>load().then(value=>{if(!on)return;const key=JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v instanceof Set?[...v]:v);if(last.current&&key!==last.current)setChanged(Date.now());last.current=key;setLive({state:'ok',value,at:Date.now()});})
      .catch(e=>on&&setLive(prev=>({state:'error',message:(e as Error).message,value:'value' in prev?prev.value:undefined})));
    run();const t=setInterval(run,every);
    const vis=()=>{if(document.visibilityState==='visible')run();};document.addEventListener('visibilitychange',vis);
    return()=>{on=false;clearInterval(t);document.removeEventListener('visibilitychange',vis);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[kick]);
  return [live,changed];
}

function useVaultLive(meta:VaultMeta,kick:number):VaultLive{
  const [state,changedAt]=usePoll(()=>view<VaultState>(meta.id,'state'),5000,kick);
  const [history]=usePoll(()=>loadHistory(meta.id),30000,kick+changedAt);
  const [proposals]=usePoll(()=>view<Proposal[]>(meta.id,'proposals'),20000,kick+changedAt);
  return {meta,state,history,proposals,changedAt};
}

export function StoreProvider({children}:{children:ReactNode}){
  const [kick,setKick]=useState(0);
  // The vault list is fixed at build time, so the hook count is stable.
  const vaults=VAULTS.map(meta=>useVaultLive(meta,kick)); // eslint-disable-line react-hooks/rules-of-hooks
  const [head]=usePoll(chainHead,2500,0);
  const feed=useMemo(()=>{
    const all:FeedEvent[]=[];
    for(const v of vaults){const h='value' in v.history?v.history.value:undefined;if(h)for(const e of h.events)all.push({...e,vault:v.meta});}
    return all.sort((a,b)=>b.at-a.at);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },vaults.map(v=>v.history));
  const feedReady=vaults.every(v=>('value' in v.history&&!!v.history.value)||v.history.state==='error')&&vaults.some(v=>'value' in v.history&&!!v.history.value);
  const feedError=vaults.map(v=>v.history.state==='error'?v.history.message:'').find(Boolean);
  const totals=useMemo(()=>{
    let cash=0n;const people=new Set<string>();let txs=0;let ready=true;
    for(const v of vaults){
      const s='value' in v.state?v.state.value:undefined;const h='value' in v.history?v.history.value:undefined;
      if(!s)ready=false;else cash+=BigInt(s.usdc_balance);
      if(h){h.depositors.forEach(d=>people.add(d));txs+=h.txCount;}
    }
    return {cash,depositors:people.size,txs,ready};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[...vaults.map(v=>v.state),...vaults.map(v=>v.history)]);
  const value:Store={vaults,head,feed,feedReady,feedError,totals,refresh:()=>setKick(k=>k+1)};
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useStore(){const s=useContext(Ctx);if(!s)throw Error('StoreProvider missing');return s;}
export const val=<T,>(l:Live<T>):T|undefined=>'value' in l?l.value:undefined;
export function priceOf(s?:VaultState){return s?sharePrice(s.usdc_balance,s.total_shares):null;}
export function openVote(p?:Proposal[]){return p?.find(x=>!x.executed&&Date.now()<x.closes_at_ms);}
