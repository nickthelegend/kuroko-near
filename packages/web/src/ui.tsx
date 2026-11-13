import {useEffect,useRef,useState,type ReactNode} from 'react';
import {nearblocksAccount,nearblocksTx,short} from './rpc';

type IconName='external'|'copy'|'check'|'x'|'chevron'|'wallet'|'arrow'|'arrowUp'|'down'|'up'|'lock'|'info'|'menu'|'vault'|'grid'|'pulse'|'vote'|'user'|'list'|'bolt'|'plus'|'search';
const paths:Record<IconName,string>={
  external:'M14 5h5v5m0-5-8 8M17 14v5H5V7h5',
  copy:'M9 9h10v10H9zM5 15V5h10',
  check:'m5 12.5 4.5 4.5L19 7.5',
  x:'M6 6l12 12M18 6 6 18',
  chevron:'m9 6 6 6-6 6',
  wallet:'M4 7.5A1.5 1.5 0 0 1 5.5 6H18v3M4 7.5v10A1.5 1.5 0 0 0 5.5 19H20V9H5.5A1.5 1.5 0 0 1 4 7.5ZM16 14h.01',
  arrow:'M5 12h14m-6-6 6 6-6 6',
  arrowUp:'M7 17 17 7m-8 0h8v8',
  down:'M12 5v14m-6-6 6 6 6-6',
  up:'M12 19V5m-6 6 6-6 6 6',
  lock:'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z',
  info:'M12 16v-5m0-3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  menu:'M4 7h16M4 12h16M4 17h16',
  vault:'M4 5h16v14H4zM4 9h16M12 13v3M9 5V3m6 2V3',
  grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  pulse:'M3 12h4l3-7 4 14 3-7h4',
  vote:'M4 13l3 3 6-7M14 13h6M14 17h6M4 21h16',
  user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  list:'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  bolt:'M13 3 5 13h6l-1 8 8-10h-6l1-8Z',
  plus:'M12 5v14M5 12h14',
  search:'m20 20-4-4m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
};
export function Icon({name,size=16}:{name:IconName;size?:number}){
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}

/** The mark: a stage-black tile, a hooded stagehand's K and the orange spotlight. */
export function Mark({size=30}:{size?:number}){
  return <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="#0e0d0c"/>
    <circle cx="23" cy="9" r="4" fill="#ff5c1a"/>
    <path d="M10 8v16M10 17l9-8.5M13.4 13.8 20 24" stroke="#f3f0e9" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>;
}

export type ArtName='hero'|'vault'|'coins'|'swap'|'ballot'|'relay'|'curtain'|'empty'|'shield';
/** Generated art (art/ART.md). The frame keeps its size while it loads; with no file the frame shows a quiet stage. */
export function Art({name,alt,className=''}:{name:ArtName;alt:string;className?:string}){
  const [failed,setFailed]=useState(false);
  return <div className={`art art-${name} ${className}`}>
    {!failed&&<img src={`/art/kuroko-${name}.webp`} alt={alt} decoding="async" loading={name==='hero'?'eager':'lazy'} onError={()=>setFailed(true)}/>}
  </div>;
}

const reduce=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Eases from the previous value to the new one, so live changes are seen rather than swapped. */
export function useTween(target:number,ms=1100){
  const [v,setV]=useState(target);
  const cur=useRef(target);
  useEffect(()=>{
    const from=cur.current;
    if(from===target||!Number.isFinite(target))return;
    if(reduce()){cur.current=target;setV(target);return;}
    const start=performance.now();let raf=0;
    const step=(t:number)=>{const k=Math.min(1,(t-start)/ms);const e=1-Math.pow(1-k,4);const x=from+(target-from)*e;cur.current=x;setV(x);if(k<1)raf=requestAnimationFrame(step);};
    raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf);
  },[target,ms]);
  return v;
}
/** A live number: tweened, grouped, with the trailing decimals faded and a short flash when it changes. */
export function Num({value,dp=2,strong=2,unit,signed=false,className=''}:{value:number|null|undefined;dp?:number;strong?:number;unit?:string;signed?:boolean;className?:string}){
  const target=value??0;
  const v=useTween(target);
  const [flash,setFlash]=useState<''|'up'|'down'>('');
  const prev=useRef<number|null|undefined>(value);
  useEffect(()=>{
    if(prev.current!=null&&value!=null&&value!==prev.current){setFlash(value>prev.current?'up':'down');const t=setTimeout(()=>setFlash(''),1600);prev.current=value;return()=>clearTimeout(t);}
    prev.current=value;
  },[value]);
  if(value==null)return <span className={`num num-empty ${className}`}>—</span>;
  const s=Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:dp,maximumFractionDigits:dp});
  const cut=dp>strong?s.length-(dp-strong):s.length;
  return <span className={`num ${flash?`num-${flash}`:''} ${className}`}>
    {signed&&value>0?'+':v<0?'−':''}{s.slice(0,cut)}<span className="num-fade">{s.slice(cut)}</span>{unit&&<span className="num-unit"> {unit}</span>}
  </span>;
}

export function Pulse({tone='ok',label}:{tone?:'ok'|'warn'|'off'|'bad';label?:string}){
  return <span className={`pulse pulse-${tone}`} role={label?'img':undefined} aria-label={label}><i/></span>;
}

export type Pt={t:number;v:number};
/**
 * A step-area chart drawn at the container's real width, with a hover readout. Points come only from replayed chain
 * events; the line runs on to "now" at the latest value.
 */
export function StepChart({points,dp=2,unit='USDC',height=260,floor0=true,empty='Nothing to chart yet.'}:{points:Pt[];dp?:number;unit?:string;height?:number;floor0?:boolean;empty?:ReactNode}){
  const ref=useRef<HTMLDivElement>(null);
  const [W,setW]=useState(720);
  const [hover,setHover]=useState<number|null>(null);
  useEffect(()=>{const el=ref.current;if(!el)return;const ro=new ResizeObserver(([e])=>setW(Math.max(240,Math.round(e.contentRect.width))));ro.observe(el);return()=>ro.disconnect();},[]);
  if(!points.length)return <div ref={ref} className="chart chart-empty">{empty}</div>;
  const H=W<520?Math.min(200,height):height,P={l:4,r:W<520?52:64,t:16,b:26};
  const now=Date.now();
  const first=points[0].t,t1=Math.max(now,points[points.length-1].t+1),t0=first-Math.max(60_000,(t1-first)*0.03);
  const vals=points.map(p=>p.v);
  const max=Math.max(...vals),min=Math.min(...vals);
  const top=floor0?niceCeil(max*1.18||1):max+Math.max(0.0005,(max-min)*0.6||max*0.004);
  const bottom=floor0?0:Math.max(0,min-Math.max(0.0005,(max-min)*0.6||max*0.004));
  const x=(t:number)=>P.l+(t-t0)/(t1-t0)*(W-P.l-P.r);
  const y=(v:number)=>P.t+(1-(v-bottom)/((top-bottom)||1))*(H-P.t-P.b);
  const startV=floor0?0:vals[0];
  let d=`M${x(t0)},${y(startV)}`;
  points.forEach((p,i)=>{d+=` L${x(p.t)},${y(i===0?startV:vals[i-1])} L${x(p.t)},${y(p.v)}`;});
  d+=` L${x(t1)},${y(vals[vals.length-1])}`;
  const area=`${d} L${x(t1)},${H-P.b} L${x(t0)},${H-P.b} Z`;
  const ticks=[0,0.5,1].map(f=>bottom+(top-bottom)*f);
  const fmt=(t:number)=>new Date(t).toLocaleString('en-US',{month:'short',day:'numeric'});
  const span=t1-t0;const xt=[t0+span*0.02,t0+span*0.5,t1];
  const onMove=(e:React.PointerEvent<SVGSVGElement>)=>{const r=(e.currentTarget as SVGSVGElement).getBoundingClientRect();const t=t0+((e.clientX-r.left-P.l)/(W-P.l-P.r))*(t1-t0);let i=-1;for(let k=0;k<points.length;k++)if(points[k].t<=t)i=k;setHover(i);};
  const hv=hover!=null&&hover>=0?points[hover]:null;
  const latest=vals[vals.length-1];
  return <div ref={ref} className="chart">
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Chart, latest ${latest.toFixed(dp)} ${unit}`} onPointerMove={onMove} onPointerLeave={()=>setHover(null)}>
      <defs><linearGradient id={`g-${unit}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".22"/><stop offset="1" stopColor="var(--accent)" stopOpacity="0"/></linearGradient></defs>
      {ticks.map(v=><g key={v}><line x1={P.l} x2={W-P.r} y1={y(v)} y2={y(v)} className="grid"/><text x={W-P.r+10} y={y(v)+4} className="tick">{v.toFixed(dp)}</text></g>)}
      {xt.map((t,i)=><text key={i} x={x(t)} y={H-6} className="tick" textAnchor={i===0?'start':i===2?'end':'middle'}>{i===2?'Now':fmt(t)}</text>)}
      <path d={area} fill={`url(#g-${unit})`} className="area"/>
      <path d={d} className="line" fill="none" pathLength={1}/>
      {points.map((p,i)=><circle key={i} cx={x(p.t)} cy={y(p.v)} r={hover===i?5:2.5} className={`pt ${hover===i?'pt-on':''}`}/>)}
      <circle cx={x(t1)} cy={y(latest)} r="5" className="now"/><circle cx={x(t1)} cy={y(latest)} r="5" className="now-ring"/>
    </svg>
    {hv&&<div className="chart-tip" style={{left:Math.min(W-170,Math.max(0,x(hv.t)-80))}}><b>{hv.v.toFixed(dp)} {unit}</b><span>{new Date(hv.t).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span></div>}
  </div>;
}
function niceCeil(v:number){if(v<=0)return 1;const e=Math.pow(10,Math.floor(Math.log10(v)));const m=v/e;return ([1,1.2,1.5,2,2.5,3,4,5,6,8,10].find(k=>m<=k)??10)*e;}

/** A tiny line for table rows and cards. */
export function Spark({points,w=96,h=28}:{points:Pt[];w?:number;h?:number}){
  if(points.length<1)return <svg width={w} height={h} className="spark spark-empty" aria-hidden="true"><line x1="0" x2={w} y1={h-2} y2={h-2}/></svg>;
  const now=Date.now(),t0=points[0].t-60_000,t1=Math.max(now,points[points.length-1].t+1);
  const max=Math.max(...points.map(p=>p.v))||1;
  const x=(t:number)=>(t-t0)/(t1-t0)*w,y=(v:number)=>h-2-(v/max)*(h-6);
  let d=`M0,${h-2}`;let last=0;
  for(const p of points){d+=` L${x(p.t)},${y(last)} L${x(p.t)},${y(p.v)}`;last=p.v;}
  d+=` L${w},${y(last)}`;
  return <svg width={w} height={h} className="spark" aria-hidden="true"><path d={`${d} L${w},${h} L0,${h} Z`} className="spark-area"/><path d={d} className="spark-line" fill="none"/></svg>;
}

export function Copy({value}:{value:string}){
  const [done,setDone]=useState(false);
  return <button type="button" className="copy" aria-label={`Copy ${value}`} title="Copy" onClick={()=>navigator.clipboard?.writeText(value).then(()=>{setDone(true);setTimeout(()=>setDone(false),1400);})}><Icon name={done?'check':'copy'} size={14}/></button>;
}
export function TxLink({hash,head=6,tail=4}:{hash:string;head?:number;tail?:number}){
  return <a className="mono tx" href={nearblocksTx(hash)} target="_blank" rel="noreferrer" aria-label={`Transaction ${hash} on NearBlocks`}>{short(hash,head,tail)}<Icon name="arrowUp" size={12}/></a>;
}
export function AccountLink({id,head=12,tail=8}:{id:string;head?:number;tail?:number}){
  return <a className="mono acct-link" href={nearblocksAccount(id)} target="_blank" rel="noreferrer">{short(id,head,tail)}</a>;
}

/** A designed empty, setup or error state: art, one line, one action. */
export function Empty({art,title,children,action,tone='plain'}:{art?:ArtName;title:string;children?:ReactNode;action?:ReactNode;tone?:'plain'|'err'|'blocked'}){
  return <div className={`empty empty-${tone}`} role={tone==='err'?'alert':undefined}>
    {art&&<Art name={art} alt="" className="empty-art"/>}
    <div className="empty-body"><b>{title}</b>{children&&<p>{children}</p>}{action}</div>
  </div>;
}
export function Skel({h=16,w='100%',r=8}:{h?:number;w?:number|string;r?:number}){return <span className="skel" style={{height:h,width:w,borderRadius:r}} aria-hidden="true"/>;}

export type Live<T>={state:'loading'}|{state:'ok';value:T;at:number}|{state:'error';message:string;value?:T};
/** Polls a loader; on an error it keeps the last good value so the page never flashes empty. */
export function useLive<T>(load:()=>Promise<T>,every=0,deps:unknown[]=[]):[Live<T>,()=>void]{
  const [live,setLive]=useState<{deps:unknown[];result:Live<T>}>({deps,result:{state:'loading'}});
  const same=(a:unknown[],b:unknown[])=>a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const [tick,setTick]=useState(0);
  useEffect(()=>{
    let on=true;
    const run=()=>load().then(value=>on&&setLive({deps,result:{state:'ok',value,at:Date.now()}})).catch(e=>on&&setLive(prev=>({deps,result:{state:'error',message:(e as Error).message,value:same(prev.deps,deps)&&'value' in prev.result?prev.result.value:undefined}})));
    run();
    const t=every?setInterval(run,every):undefined;
    return()=>{on=false;if(t)clearInterval(t);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tick,...deps]);
  return [same(live.deps,deps)?live.result:{state:'loading'},()=>setTick(t=>t+1)];
}
export const valueOf=<T,>(l:Live<T>):T|undefined=>'value' in l?l.value:undefined;

/** Re-renders every few seconds so "x s ago" labels stay true. */
export function useNow(every=1000){const [now,setNow]=useState(Date.now());useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),every);return()=>clearInterval(t);},[every]);return now;}
export function agoShort(ms:number,now=Date.now()){const s=Math.max(0,Math.round((now-ms)/1000));if(s<5)return 'just now';if(s<60)return `${s}s ago`;const m=Math.floor(s/60);if(m<60)return `${m}m ago`;const h=Math.floor(m/60);if(h<48)return `${h}h ago`;return `${Math.floor(h/24)}d ago`;}

/** "Read 3s ago" with a pulse: how fresh a polled chain value is. */
export function Fresh<T>({live,label='Read'}:{live:Live<T>;label?:string}){
  const now=useNow(1000);
  const at='at' in live?live.at:null;
  return <span className="fresh-chip"><Pulse tone={live.state==='error'?'warn':at?'ok':'off'}/>{at?`${label} ${agoShort(at,now)}`:live.state==='error'?'Retrying':'Reading chain…'}</span>;
}
