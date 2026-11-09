import {useEffect,useState,type ReactNode} from 'react';
import artFiles from 'virtual:art';

type IconName='arrow'|'external'|'refresh'|'wallet'|'check'|'x'|'lock'|'scale'|'pulse'|'shield'|'key'|'eye'|'layers'|'flag'|'copy'|'vote'|'spark';
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
  key:'M14 10a4 4 0 1 0-3.9 4H11l2 2h2v2h2v2h3v-3l-5.3-5.3A4 4 0 0 0 14 10Z',
  eye:'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  layers:'M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  flag:'M5 21V4m0 0h11l-2 4 2 4H5',
  copy:'M9 9h10v10H9zM5 15V5h10',
  vote:'M4 13h16v7H4zM8 13V5h8v8M10 9l1.5 1.5L14 8',
  spark:'M12 3v5m0 8v5M3 12h5m8 0h5',
};
export function Icon({name,size=18}:{name:IconName;size?:number}){
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}

export type Tone='live'|'warn'|'bad'|'idle';
export function Chip({tone='idle',children}:{tone?:Tone;children:ReactNode}){return <span className={`chip chip-${tone}`}><i/>{children}</span>;}

/** A stage cue: the section eyebrow. */
export function Cue({n,children}:{n?:string;children:ReactNode}){return <p className="cue">{n&&<b>{n}</b>}<span>{children}</span></p>;}

/** The 黒 mark. */
export function Mark({size='md'}:{size?:'sm'|'md'|'lg'}){return <span className={`mark mark-${size}`} aria-hidden="true">黒</span>;}

/** A number whose decimals are set lighter, with a unit. */
export function Num({value,unit,dim}:{value:string|null;unit?:string;dim?:boolean}){
  if(value===null)return <span className="num num-empty">—</span>;
  const [whole,frac]=value.split('.');
  return <span className={`num${dim?' num-dim':''}`}>{whole}{frac!==undefined&&<small>.{frac}</small>}{unit&&<em>{unit}</em>}</span>;
}

/** Full-bleed art with faded edges, or a designed stage placeholder until Nick's file lands. */
export function Art({name,className='',children}:{name:string;className?:string;children?:ReactNode}){
  const has=artFiles.includes(`${name}.webp`);
  return <div className={`art ${has?'art-real':'art-stage'} ${className}`} aria-hidden="true">
    {has?<img src={`/art/${name}.webp`} alt="" loading={name.endsWith('hero')?'eager':'lazy'}/>:<StagePlaceholder>{children}</StagePlaceholder>}
  </div>;
}
function StagePlaceholder({children}:{children?:ReactNode}){
  return <div className="stage-ph"><span className="beam"/><span className="floor"/><span className="haze"/>{children}</div>;
}
export const hasArt=(name:string)=>artFiles.includes(`${name}.webp`);

export function Empty({icon='eye',title,children,action}:{icon?:IconName;title:string;children?:ReactNode;action?:ReactNode}){
  return <div className="empty"><span className="empty-icon"><Icon name={icon} size={20}/></span><strong>{title}</strong>{children&&<p>{children}</p>}{action}</div>;
}

export function Copy({value}:{value:string}){
  const [done,setDone]=useState(false);
  return <button type="button" className="copy" aria-label="Copy" title={value} onClick={()=>navigator.clipboard?.writeText(value).then(()=>{setDone(true);setTimeout(()=>setDone(false),1400)})}><Icon name={done?'check':'copy'} size={14}/></button>;
}

export type Live<T>={state:'loading'}|{state:'ok';value:T;at:number}|{state:'error';message:string};
export function useLive<T>(load:()=>Promise<T>,every=0,deps:unknown[]=[]):[Live<T>,()=>void]{
  const [live,setLive]=useState<Live<T>>({state:'loading'});
  const [tick,setTick]=useState(0);
  useEffect(()=>{
    let on=true;
    const run=()=>load().then(value=>on&&setLive({state:'ok',value,at:Date.now()})).catch(e=>on&&setLive({state:'error',message:(e as Error).message}));
    run();
    const t=every?setInterval(run,every):undefined;
    return()=>{on=false;if(t)clearInterval(t);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tick,...deps]);
  return [live,()=>setTick(t=>t+1)];
}
