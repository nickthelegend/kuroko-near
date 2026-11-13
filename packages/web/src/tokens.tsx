import {tokenName} from './rpc';

/** Plain lettered token discs in each token's familiar colour; no third-party logo files are shipped. */
const TOKENS:Record<string,{bg:string;fg:string;t:string}>={
  USDC:{bg:'#2775ca',fg:'#fff',t:'$'},'USDC.e':{bg:'#5b8fd6',fg:'#fff',t:'$'},USDT:{bg:'#26a17b',fg:'#fff',t:'₮'},
  wNEAR:{bg:'#0e0d0c',fg:'#fff',t:'N'},ETH:{bg:'#627eea',fg:'#fff',t:'Ξ'},AURORA:{bg:'#70d44b',fg:'#0e0d0c',t:'A'},
};
export function Token({name,size=22}:{name:string;size?:number}){
  const k=TOKENS[name]??{bg:'#d9d3c7',fg:'#0e0d0c',t:name.slice(0,1)};
  return <span className="token" style={{width:size,height:size,background:k.bg,color:k.fg,fontSize:size*0.5}} aria-hidden="true">{k.t}</span>;
}
/** "USDC ↔ wNEAR" as two overlapping discs and the counter-asset's name. */
export function Pair({pair,size=20,label=true}:{pair:string;size?:number;label?:boolean}){
  const [a,b]=pair.split('/').map(tokenName);
  return <span className="pair" title={`${a} ↔ ${b}`}><span className="pair-discs"><Token name={a} size={size}/><Token name={b} size={size}/></span>{label&&<span>{b}</span>}</span>;
}
