import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {Point} from './activity';

type IconName='external'|'copy'|'check'|'x'|'chevron'|'wallet';
const paths:Record<IconName,string>={
  external:'M14 5h5v5m0-5-8 8M17 14v5H5V7h5',
  copy:'M9 9h10v10H9zM5 15V5h10',
  check:'m5 12.5 4.5 4.5L19 7.5',
  x:'M6 6l12 12M18 6 6 18',
  chevron:'m9 6 6 6-6 6',
  wallet:'M4 7.5A1.5 1.5 0 0 1 5.5 6H18v3M4 7.5v10A1.5 1.5 0 0 0 5.5 19H20V9H5.5A1.5 1.5 0 0 1 4 7.5ZM16 14h.01',
};
export function Icon({name,size=16}:{name:IconName;size?:number}){
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}

/** The mark: a black square with a white K. */
export function Mark({size=28}:{size?:number}){
  return <svg className="mark" width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
    <rect width="28" height="28" rx="7" fill="#151514"/>
    <path d="M9.5 7.5v13M9.5 15l8-7.5M12.6 12.2l5.4 8.3" stroke="#fafaf8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>;
}

/** One big number with a lighter unit and a small label above it, no box. */
export function Stat({label,value,unit,note}:{label:string;value:ReactNode;unit?:string;note?:ReactNode}){
  return <div className="stat">
    <span className="stat-label">{label}</span>
    <span className="stat-value">{value}{unit&&<span className="stat-unit"> {unit}</span>}</span>
    {note&&<span className="stat-note">{note}</span>}
  </div>;
}

/** Step chart of the vault's USDC (or share price) from its first deposit to now, drawn from replayed chain events. */
export function ValueChart({points,metric}:{points:Point[];metric:'cash'|'price'}){
  // Drawn at the container's real width so tick labels stay legible on phones.
  const ref=useRef<HTMLElement>(null);
  const [W,setW]=useState(760);
  useEffect(()=>{const el=ref.current;if(!el)return;const ro=new ResizeObserver(([e])=>setW(Math.max(260,Math.round(e.contentRect.width))));ro.observe(el);return()=>ro.disconnect();},[]);
  const H=W<520?200:260,P={l:0,r:W<520?44:56,t:12,b:12};
  if(!points.length)return <p className="chart-empty">No deposits yet, so there is nothing to chart.</p>;
  const now=Date.now();
  const first=points[0].at,t1=Math.max(now,points[points.length-1].at+1);const t0=first-Math.max(60_000,(t1-first)*0.04);
  const val=(p:Point)=>Number(metric==='cash'?p.cash:p.price)/1e6;
  const vals=points.map(val);
  const top=metric==='cash'?niceCeil(Math.max(...vals)*1.15):Math.max(1.02,...vals.map(v=>v*1.01));
  const bottom=metric==='cash'?0:Math.min(0.98,...vals.map(v=>v*0.99));
  const x=(t:number)=>P.l+(t-t0)/(t1-t0)*(W-P.l-P.r);
  const y=(v:number)=>P.t+(1-(v-bottom)/(top-bottom||1))*(H-P.t-P.b);
  const startV=metric==='cash'?0:vals[0];
  let d=`M${x(t0)},${y(startV)}`;
  points.forEach((p,i)=>{d+=` L${x(p.at)},${y(i===0?startV:vals[i-1])} L${x(p.at)},${y(vals[i])}`;});
  d+=` L${x(t1)},${y(vals[vals.length-1])}`;
  const area=`${d} L${x(t1)},${H-P.b} L${x(t0)},${H-P.b} Z`;
  const ticks=[0,0.5,1].map(f=>bottom+(top-bottom)*f);
  const dp=metric==='cash'?2:4;
  const day=(t:number)=>new Date(t).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  const latest=vals[vals.length-1];
  return <figure className="chart" ref={ref}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${metric==='cash'?'Vault USDC':'Share price'} over time, now ${latest.toFixed(dp)}`}>
      {ticks.map(v=><g key={v}><line x1={P.l} x2={W-P.r} y1={y(v)} y2={y(v)} className="grid"/><text x={W-P.r+8} y={y(v)+4} className="tick">{v.toFixed(dp)}</text></g>)}
      {metric==='cash'&&<path d={area} className="area"/>}
      <path d={d} className="line" fill="none"/>
      <circle cx={x(t1)} cy={y(latest)} r="4" className="dot"/>
    </svg>
    <figcaption style={{marginRight:P.r}}><span>{day(t0)}</span><span>Now</span></figcaption>
  </figure>;
}
function niceCeil(v:number){if(v<=0)return 1;const e=Math.pow(10,Math.floor(Math.log10(v)));const m=v/e;return ([1,1.2,1.5,2,2.5,3,4,5,6,8,10].find(k=>m<=k)??10)*e;}

export function Copy({value}:{value:string}){
  const [done,setDone]=useState(false);
  return <button type="button" className="copy" aria-label={`Copy ${value}`} title="Copy" onClick={()=>navigator.clipboard?.writeText(value).then(()=>{setDone(true);setTimeout(()=>setDone(false),1400)})}><Icon name={done?'check':'copy'} size={14}/></button>;
}

export type Live<T>={state:'loading'}|{state:'ok';value:T;at:number}|{state:'error';message:string;value?:T};
/** Polls a loader; on an error it keeps the last good value so the page never flashes empty. */
export function useLive<T>(load:()=>Promise<T>,every=0,deps:unknown[]=[]):[Live<T>,()=>void]{
  const [live,setLive]=useState<Live<T>>({state:'loading'});
  const [tick,setTick]=useState(0);
  useEffect(()=>{
    let on=true;
    const run=()=>load().then(value=>on&&setLive({state:'ok',value,at:Date.now()})).catch(e=>on&&setLive(prev=>({state:'error',message:(e as Error).message,value:'value' in prev?prev.value:undefined})));
    run();
    const t=every?setInterval(run,every):undefined;
    return()=>{on=false;if(t)clearInterval(t);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tick,...deps]);
  return [live,()=>setTick(t=>t+1)];
}
export const valueOf=<T,>(l:Live<T>):T|undefined=>'value' in l?l.value:undefined;

/** Re-renders every few seconds so "x s ago" labels stay true. */
export function useNow(every=5000){const [now,setNow]=useState(Date.now());useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),every);return()=>clearInterval(t);},[every]);return now;}
