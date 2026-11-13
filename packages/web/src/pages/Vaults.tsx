import {Link,go} from '../App';
import {useStore,val,openVote,type VaultLive} from '../store';
import {cashPoints,priceNum,totalPoints,usd,bps,statusOf,pairList} from '../derive';
import {usdc} from '../rpc';
import {Art,Icon,Num,Pulse,Skel,Spark,StepChart,agoShort,useNow} from '../ui';
import {Pair,Token} from '../tokens';
import {Feed} from './Activity';
import {RelayMini} from './Relay';

/** The Earn list (Yearn / Morpho anatomy): a dark summary card, then one row per vault, then live activity. */
export default function VaultsPage(){
  const {vaults,totals,feed}=useStore();
  const now=useNow(1000);
  const total=totalPoints(vaults.map(v=>val(v.history)));
  const last=feed[0];
  return <div className="page">
    <section className="summary">
      <div className="summary-copy">
        <h1>Deposit USDC.<br/><span className="dim">Earn when Kuroko fills swaps.</span></h1>
        <div className="summary-num">
          <span className="label">Total deposits, all vaults</span>
          {totals.ready?<Num value={usd(totals.cash)} dp={2} unit="USDC" className="big-num"/>:<Skel h={56} w={260}/>}
          <span className="summary-meta">
            <span><b>{vaults.length}</b> vaults</span>
            <span><b>{totals.depositors||'…'}</b> depositors</span>
            <span><b>{totals.txs||'…'}</b> on-chain transactions</span>
            {last&&<span>Last {last.kind==='deposit'?'deposit':'withdrawal'} <b>{agoShort(last.at,now)}</b></span>}
          </span>
        </div>
        <div className="summary-chart"><StepChart points={total} height={150} empty="Loading history…"/></div>
      </div>
      <div className="summary-art"><Art name="vault" alt="A matte black vault under an orange spotlight"/></div>
    </section>

    <section className="block">
      <div className="block-head"><h2>Vaults</h2><span className="muted">All on NEAR testnet · Circle testnet USDC</span></div>
      <div className="vtable" role="table" aria-label="Vaults">
        <div className="vrow vrow-head" role="row">
          <span role="columnheader">Vault</span><span role="columnheader" className="r">Deposits</span><span role="columnheader" className="r hide-md">Share price</span>
          <span role="columnheader" className="hide-md">Quotes</span><span role="columnheader" className="r hide-md">Fee floor</span><span role="columnheader" className="r">APY</span><span role="columnheader" aria-hidden="true"/>
        </div>
        {vaults.map(v=><VaultRow key={v.meta.slug} v={v}/>)}
      </div>
      <p className="fine">APY stays “—” until a vault earns from a real swap fill. Fills need NEAR Intents relay access, which is <Link to="/relay">not granted yet</Link>.</p>
    </section>

    <div className="split">
      <section className="block">
        <div className="block-head"><h2>Live activity</h2><Link to="/activity" className="more">All activity <Icon name="arrow" size={14}/></Link></div>
        <Feed limit={6} compact/>
      </section>
      <section className="block"><div className="block-head"><h2>Solver relay</h2><Link to="/relay" className="more">Relay status <Icon name="arrow" size={14}/></Link></div><RelayMini/></section>
    </div>
  </div>;
}

export function VaultRow({v}:{v:VaultLive}){
  const s=val(v.state),h=val(v.history),p=val(v.proposals);
  const st=statusOf(s,!!openVote(p),v.state.state==='error');
  const to=`/vault/${v.meta.slug}`;
  return <a className="vrow" role="row" href={to} onClick={go(to)}>
    <span className="vname" role="cell">
      <span className={`vicon vicon-${v.meta.tone}`}><Token name="USDC" size={34}/></span>
      <span className="vname-t"><b>{v.meta.name}</b><span className="vtags"><Pulse tone={st.tone}/>{st.label}<span className="sep">·</span>{h?`${h.depositors.size} depositor${h.depositors.size===1?'':'s'}`:'…'}</span></span>
    </span>
    <span className="r vdep" role="cell">{s?<><Num value={usd(s.usdc_balance)} dp={2}/><span className="unit">USDC</span></>:<Skel w={80}/>}<Spark points={cashPoints(h)} w={88} h={24}/></span>
    <span className="r hide-md" role="cell">{s?<Num value={priceNum(s)} dp={6} strong={2}/>:<Skel w={70}/>}</span>
    <span className="hide-md vpairs" role="cell">{s?pairList(s).map(pr=><Pair key={pr} pair={pr} size={18}/>):<Skel w={90}/>}</span>
    <span className="r hide-md" role="cell">{s?bps(s.constitution.min_spread_bps):'…'}</span>
    <span className="r" role="cell"><span className="apy-none" title="No fills yet">—</span></span>
    <span className="r chev" role="cell" aria-hidden="true"><Icon name="chevron"/></span>
  </a>;
}
export const fmtUsdc=(raw?:string)=>raw?usdc(raw):'—';
