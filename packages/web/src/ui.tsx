import {useEffect,useRef,useState,type ReactNode} from 'react';
import artFiles from 'virtual:art';
import type {Point} from './activity';

type IconName='arrow'|'external'|'refresh'|'wallet'|'check'|'x'|'lock'|'scale'|'pulse'|'shield'|'layers'|'flag'|'copy'|'vote'|'plus'|'minus'|'swap'|'coins'|'user'|'clock';
const paths:Record<IconName,string>={
  arrow:'M5 12h14m-5-5 5 5-5 5',
  external:'M14 5h5v5m0-5-8 8M17 14v5H5V7h5',
  refresh:'M20 11a8 8 0 0 0-14.3-4.9L4 8m0-4v4h4m-4 5a8 8 0 0 0 14.3 4.9L20 16m0 4v-4h-4',
  wallet:'M4 7.5A1.5 1.5 0 0 1 5.5 6H18v3M4 7.5v10A1.5 1.5 0 0 0 5.5 19H20V9H5.5A1.5 1.5 0 0 1 4 7.5ZM16 14h.01',
  check:'m5 12.5 4.5 4.5L19 7.5',
  x:'M6 6l12 12M18 6 6 18',
  lock:'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9h-13zM12 15v2',
  scale:'M12 4v16M5 20h14M6 8h12M6 8l-3 6h6L6 8Zm12 0-3 6h6l-3-6Z',
  pulse:'M3 12h4l2-6 4 12 2-6h6',
  shield:'M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z',
  layers:'M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  flag:'M5 21V4m0 0h11l-2 4 2 4H5',
  copy:'M9 9h10v10H9zM5 15V5h10',
  vote:'M4 13h16v7H4zM8 13V5h8v8M10 9l1.5 1.5L14 8',
  plus:'M12 5v14M5 12h14',
  minus:'M5 12h14',
  swap:'M7 7h12l-3-3M17 17H5l3 3',
  coins:'M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Zm-8 3v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5',
  user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  clock:'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
};
export function Icon({name,size=18}:{name:IconName;size?:number}){
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}

export type Tone='live'|'warn'|'bad'|'idle'|'kaki';
export function Chip({tone='idle',children}:{tone?:Tone;children:ReactNode}){return <span className={`chip chip-${tone}`}><i/>{children}</span>;}

/** The mark: the three stripes of the kabuki curtain (black, persimmon, green). */
export function Mark({size=30}:{size?:number}){
  return <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="#1b1310"/>
    <rect x="7" y="7" width="5" height="18" rx="1.5" fill="#fcf0e8"/>
    <rect x="13.5" y="7" width="5" height="18" rx="1.5" fill="#f06a2a"/>
    <rect x="20" y="7" width="5" height="18" rx="1.5" fill="#88a83a"/>
  </svg>;
}

const reduced=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts up to a number once it is known (static under reduced motion). */
export function CountUp({value,decimals=2,prefix='',suffix=''}:{value:number|null;decimals?:number;prefix?:string;suffix?:string}){
  const [shown,setShown]=useState(value??0);
  const from=useRef(0);
  useEffect(()=>{
    if(value===null)return;
    if(reduced()){setShown(value);from.current=value;return;}
    const start=performance.now();const a=from.current;const d=900;let raf=0;
    const tick=(t:number)=>{const k=Math.min(1,(t-start)/d);const e=1-Math.pow(1-k,3);setShown(a+(value-a)*e);if(k<1)raf=requestAnimationFrame(tick);else from.current=value;};
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
  },[value]);
  if(value===null)return <span className="num num-empty" aria-label="Loading">—</span>;
  const text=shown.toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
  return <span className="num" aria-label={`${prefix}${value.toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}${suffix}`}><span aria-hidden="true">{prefix}{text}{suffix&&<em>{suffix}</em>}</span></span>;
}

/** Step chart of the vault's USDC from its first deposit to now, drawn from replayed chain events. */
export function ValueChart({points,metric}:{points:Point[];metric:'cash'|'price'}){
  const W=720,H=240,P={l:8,r:8,t:16,b:28};
  if(!points.length)return <div className="chart-empty"><Icon name="pulse"/>No deposits yet, so there is nothing to chart.</div>;
  const now=Date.now();
  const t0=points[0].at,t1=Math.max(now,points[points.length-1].at+1);
  const val=(p:Point)=>Number(metric==='cash'?p.cash:p.price)/1e6;
  const vals=points.map(val);const max=Math.max(...vals,metric==='price'?1.02:0.000001);const min=metric==='price'?Math.min(...vals,0.98):0;
  const x=(t:number)=>P.l+(t-t0)/(t1-t0)*(W-P.l-P.r);
  const y=(v:number)=>P.t+(1-(v-min)/(max-min||1))*(H-P.t-P.b);
  let d=`M${x(t0)},${y(metric==='cash'?0:vals[0])}`;
  points.forEach((p,i)=>{d+=` L${x(p.at)},${y(i===0&&metric==='cash'?0:vals[i-1]??vals[0])} L${x(p.at)},${y(vals[i])}`;});
  d+=` L${x(t1)},${y(vals[vals.length-1])}`;
  const area=`${d} L${x(t1)},${H-P.b} L${x(t0)},${H-P.b} Z`;
  const fmt=(t:number)=>new Date(t).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  return <figure className="chart">
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${metric==='cash'?'Vault USDC':'Share price'} over time, latest ${vals[vals.length-1].toFixed(6)}`}>
      <defs><linearGradient id="kfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f06a2a" stopOpacity=".28"/><stop offset="1" stopColor="#f06a2a" stopOpacity="0"/></linearGradient></defs>
      {[0.25,0.5,0.75].map(f=><line key={f} x1={P.l} x2={W-P.r} y1={P.t+f*(H-P.t-P.b)} y2={P.t+f*(H-P.t-P.b)} className="grid"/>)}
      <path d={area} fill="url(#kfill)"/>
      <path d={d} className="line" fill="none" vectorEffect="non-scaling-stroke"/>
      {points.map((p,i)=><circle key={i} cx={x(p.at)} cy={y(vals[i])} r="4" className="dot" vectorEffect="non-scaling-stroke"/>)}
    </svg>
    <figcaption><span>{fmt(t0)}</span><span>now</span></figcaption>
  </figure>;
}

/** Framed art, or a designed gradient placeholder until the file exists. */
export function Art({name,className=''}:{name:string;className?:string}){
  const has=artFiles.includes(`${name}.webp`);
  return <div className={`art ${has?'art-real':'art-ph'} ${className}`} aria-hidden="true">{has&&<img src={`/art/${name}.webp`} alt="" decoding="async"/>}</div>;
}

export function Empty({icon='pulse',title,children,action}:{icon?:IconName;title:string;children?:ReactNode;action?:ReactNode}){
  return <div className="empty"><span className="empty-icon"><Icon name={icon} size={20}/></span><strong>{title}</strong>{children&&<p>{children}</p>}{action}</div>;
}

export function Copy({value}:{value:string}){
  const [done,setDone]=useState(false);
  return <button type="button" className="copy" aria-label={`Copy ${value}`} title="Copy" onClick={()=>navigator.clipboard?.writeText(value).then(()=>{setDone(true);setTimeout(()=>setDone(false),1400)})}><Icon name={done?'check':'copy'} size={15}/></button>;
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
