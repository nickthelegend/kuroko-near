import {useEffect,useMemo,useRef,useState} from 'react';
import {Link} from '../App';
import {useStore,type FeedEvent} from '../store';
import {TEST_ACCOUNTS,VAULTS} from '../vaults';
import {short,when} from '../rpc';
import {AccountLink,Empty,Icon,Num,Pulse,Skel,TxLink,agoShort,useNow} from '../ui';

/** Every deposit and withdrawal across the vaults, newest first, rebuilt from NEP-141 transfer events on chain. */
export function Feed({limit,compact=false,filter}:{limit?:number;compact?:boolean;filter?:(e:FeedEvent)=>boolean}){
  const {feed,feedReady,feedError}=useStore();
  const now=useNow(1000);
  const seen=useRef<Set<string>|null>(null);
  const [fresh,setFresh]=useState<Set<string>>(new Set());
  const key=(e:FeedEvent)=>`${e.hash}:${e.kind}:${e.vault.slug}`;
  useEffect(()=>{
    if(!feedReady)return;
    if(!seen.current){seen.current=new Set(feed.map(key));return;}
    const added=feed.map(key).filter(k=>!seen.current!.has(k));
    if(!added.length)return;
    added.forEach(k=>seen.current!.add(k));
    setFresh(new Set(added));const t=setTimeout(()=>setFresh(new Set()),6000);return()=>clearTimeout(t);
  },[feed,feedReady]);
  const rows=(filter?feed.filter(filter):feed).slice(0,limit??Infinity);
  if(!feedReady&&!feed.length)return feedError
    ?<Empty art="relay" tone="err" title="Activity could not load">{feedError}</Empty>
    :<div className="feed" aria-busy="true">{[0,1,2,3].map(i=><div key={i} className="feed-row"><Skel h={36} w={36} r={12}/><Skel w="60%"/></div>)}</div>;
  if(!rows.length)return <Empty art="empty" title="No activity here yet">The first deposit will appear here within seconds, with its transaction.</Empty>;
  return <ol className={`feed ${compact?'feed-compact':''}`}>
    {rows.map(e=>{const dep=e.kind==='deposit';return <li key={key(e)} className={`feed-row ${fresh.has(key(e))?'fresh':''}`}>
      <span className={`feed-ic ${dep?'in':'out'}`}><Icon name={dep?'down':'up'} size={16}/></span>
      <span className="feed-main">
        <span className="feed-line"><AccountLink id={e.account} head={compact?10:14} tail={compact?6:8}/>{TEST_ACCOUNTS.has(e.account)&&<span className="tag" title="A Kuroko team test account">test</span>} {dep?'deposited':'withdrew'} <b><Num value={Number(e.amount)/1e6} dp={2}/> USDC</b>{!compact&&<> {dep?'into':'from'} <Link to={`/vault/${e.vault.slug}`}>{e.vault.name}</Link></>}{compact&&<span className="muted"> · {e.vault.short}</span>}</span>
        <span className="feed-sub"><time dateTime={new Date(e.at).toISOString()} title={when(e.at)}>{agoShort(e.at,now)}</time><span className="sep">·</span><TxLink hash={e.hash}/></span>
      </span>
      {!compact&&<span className="feed-shares r"><span className="muted">{dep?'+':'−'}{(Number(e.shares)/1e6).toFixed(4)} shares</span></span>}
    </li>;})}
  </ol>;
}

export default function ActivityPage(){
  const {feed,feedReady,head}=useStore();
  const now=useNow(1000);
  const [kind,setKind]=useState<'all'|'deposit'|'withdrawal'>('all');
  const [vault,setVault]=useState('all');
  const stats=useMemo(()=>{let dep=0n,wd=0n,nd=0,nw=0;for(const e of feed){if(e.kind==='deposit'){dep+=e.amount;nd++;}else{wd+=e.amount;nw++;}}return {dep,wd,nd,nw,people:new Set(feed.map(e=>e.account)).size};},[feed]);
  const filter=(e:FeedEvent)=>(kind==='all'||e.kind===kind)&&(vault==='all'||e.vault.slug===vault);
  return <div className="page">
    <header className="page-head">
      <div><h1>Activity</h1><p className="lede">Every deposit and withdrawal in every Kuroko vault, read from NEAR testnet. New transactions appear as their block is indexed.</p></div>
      <span className="live-chip"><Pulse tone={head.state==='error'?'bad':'ok'}/>Watching {VAULTS.length} vaults</span>
    </header>
    <section className="kpis kpis-4">
      <div className="kpi"><span className="label">Deposited, all time</span>{feedReady?<Num value={Number(stats.dep)/1e6} dp={2} unit="USDC" className="kpi-num"/>:<Skel h={34} w={140}/>}<span className="kpi-sub">{stats.nd} deposits</span></div>
      <div className="kpi"><span className="label">Withdrawn, all time</span>{feedReady?<Num value={Number(stats.wd)/1e6} dp={2} unit="USDC" className="kpi-num"/>:<Skel h={34} w={140}/>}<span className="kpi-sub">{stats.nw} withdrawals</span></div>
      <div className="kpi"><span className="label">Accounts</span>{feedReady?<Num value={stats.people} dp={0} className="kpi-num"/>:<Skel h={34} w={60}/>}<span className="kpi-sub">all team test accounts so far</span></div>
      <div className="kpi"><span className="label">Latest</span><span className="kpi-num">{feed[0]?agoShort(feed[0].at,now):'—'}</span><span className="kpi-sub">{feed[0]?<>{feed[0].kind==='deposit'?'deposit':'withdrawal'} · {short(feed[0].hash,6,4)}</>:'no events yet'}</span></div>
    </section>
    <section className="block">
      <div className="block-head wrap-row">
        <div className="seg" role="group" aria-label="Type">{(['all','deposit','withdrawal'] as const).map(k=><button key={k} type="button" aria-pressed={kind===k} onClick={()=>setKind(k)}>{k==='all'?'All':k==='deposit'?'Deposits':'Withdrawals'}</button>)}</div>
        <label className="select"><span className="sr">Vault</span><select value={vault} onChange={e=>setVault(e.target.value)}><option value="all">All vaults</option>{VAULTS.map(v=><option key={v.slug} value={v.slug}>{v.name}</option>)}</select></label>
      </div>
      <Feed filter={filter}/>
      <p className="fine">Source: FastNEAR’s public testnet transaction index; each row is a NEP-141 <code>ft_transfer</code> event in a transaction that touched the vault, and links to NearBlocks.</p>
    </section>
  </div>;
}
