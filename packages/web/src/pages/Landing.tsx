import {useState} from 'react';
import {Heartbeat,Link,WalletButton,go} from '../App';
import {useStore,val} from '../store';
import {priceNum,totalPoints,usd} from '../derive';
import {acctName} from '../rpc';
import {VAULTS} from '../vaults';
import {Art,Icon,Mark,Num,Pulse,Skel,StepChart,agoShort,useNow} from '../ui';
import {Token} from '../tokens';
import {VaultRow} from './Vaults';
import {RelayMini} from './Relay';

/** The marketing page: one dark stage hero with the live vault card, then light sections, every number from chain. */
export default function Landing(){
  return <div className="landing">
    <LandingNav/>
    <Hero/>
    <LiveBand/>
    <How/>
    <VaultsPreview/>
    <Features/>
    <Honest/>
    <Faq/>
    <BigFooter/>
  </div>;
}

function LandingNav(){
  const [open,setOpen]=useState(false);
  return <header className="lnav">
    <div className="lnav-in">
      <Link to="/" className="brand brand-light" label="Kuroko home"><Mark/><span>Kuroko</span></Link>
      <nav className={`lnav-links ${open?'open':''}`} aria-label="Site">
        <a href="#how" onClick={()=>setOpen(false)}>How it works</a>
        <Link to="/vaults">Vaults</Link>
        <Link to="/relay">Relay</Link>
        <Link to="/governance">Governance</Link>
        <a href="#faq" onClick={()=>setOpen(false)}>FAQ</a>
      </nav>
      <div className="lnav-end">
        <span className="hide-sm"><Heartbeat/></span>
        <a href="/vaults" onClick={go('/vaults')} className="btn btn-sm btn-accent">Launch app</a>
        <button type="button" className="lnav-menu" aria-label="Menu" aria-expanded={open} onClick={()=>setOpen(o=>!o)}><Icon name="menu" size={20}/></button>
      </div>
    </div>
  </header>;
}

function Hero(){
  const {vaults,feed}=useStore();const now=useNow(1000);
  const core=vaults[0];const s=val(core.state);
  return <section className="hero">
    <div className="hero-stage">
      <Art name="hero" alt="A matte black vault on a dark stage, lit from above by one orange spotlight" className="hero-art"/>
      <div className="hero-copy">
        <h1>Your USDC<br/>works backstage.</h1>
        <p>Kuroko is a USDC vault on NEAR. A solver fills other people’s swaps on NEAR Intents, inside rules the depositors vote on, and the spread goes to your shares.</p>
        <div className="hero-cta">
          <a href="/vault/core" onClick={go('/vault/core')} className="btn btn-accent btn-lg">Deposit USDC <Icon name="arrow" size={18}/></a>
          <a href="/vaults" onClick={go('/vaults')} className="btn btn-ghost-dark btn-lg">Explore vaults</a>
        </div>
        <p className="hero-note"><Pulse tone="ok"/>Live on NEAR testnet. Swap fills wait on relay access.</p>
      </div>
      <div className="hero-card" aria-label="Kuroko Core USDC, live">
        <div className="hc-top"><span className={`vicon vicon-core`}><Token name="USDC" size={30}/></span><span><b>{core.meta.name}</b><span className="hc-sub"><Pulse tone="ok"/>Open · testnet</span></span></div>
        <span className="label">Total deposits</span>
        <div className="hc-num">{s?<Num value={usd(s.usdc_balance)} dp={2} unit="USDC"/>:<Skel h={44} w={180}/>}</div>
        <div className="hc-row"><span>Share price</span><b>{s?<Num value={priceNum(s)} dp={6} strong={2}/>:'…'}</b></div>
        <div className="hc-row"><span>APY</span><b className="apy-none">— <span className="muted">no fills yet</span></b></div>
        <ol className="hc-feed">{feed.filter(e=>e.vault.slug==='core').slice(0,3).map(e=><li key={e.hash+e.kind+e.vault.slug}><span className={`feed-ic sm ${e.kind==='deposit'?'in':'out'}`}><Icon name={e.kind==='deposit'?'down':'up'} size={12}/></span><span className="mono">{acctName(e.account)}</span><span>{e.kind==='deposit'?'+':'−'}{(Number(e.amount)/1e6).toFixed(2)}</span><span className="muted">{agoShort(e.at,now)}</span></li>)}</ol>
        <a href="/vault/core" onClick={go('/vault/core')} className="btn btn-ink wide">Open vault</a>
      </div>
    </div>
  </section>;
}

function LiveBand(){
  const {totals,head,vaults}=useStore();
  const h=val(head);
  const tp=totalPoints(vaults.map(v=>val(v.history)));
  return <section className="band">
    <div className="band-in">
      <div className="band-stat"><span className="label">Total deposits</span>{totals.ready?<Num value={usd(totals.cash)} dp={2} unit="USDC" className="band-num"/>:<Skel h={48} w={180}/>}</div>
      <div className="band-stat"><span className="label">Depositors</span>{totals.depositors?<Num value={totals.depositors} dp={0} className="band-num"/>:<Skel h={48} w={60}/>}</div>
      <div className="band-stat"><span className="label">Vault transactions</span>{totals.txs?<Num value={totals.txs} dp={0} className="band-num"/>:<Skel h={48} w={80}/>}</div>
      <div className="band-stat"><span className="label">NEAR testnet block</span><span className="band-num mono-num">{h?h.height.toLocaleString('en-US'):'…'}</span></div>
      <div className="band-chart"><StepChart points={tp} height={120} empty="Loading…"/></div>
    </div>
    <p className="band-note">Read from NEAR testnet a moment ago, and every few seconds while this page is open. The numbers are small because this is testnet money.</p>
  </section>;
}

function How(){
  return <section className="how" id="how">
    <div className="section-in">
      <h2 className="h-sec">Three moves, all in the open.</h2>
      <div className="how-flow">
        <div className="how-step"><Art name="vault" alt="A matte black vault"/><h3>You deposit USDC</h3><p>The vault mints shares at the current share price. Withdraw your share of the vault any time no vote is open.</p></div>
        <div className="how-step"><Art name="swap" alt="Two interlocking black tokens being exchanged"/><h3>A solver quotes swaps</h3><p>Traders on NEAR Intents ask for prices. Kuroko’s solver answers only with pairs, sizes and fees the vault’s rules allow.</p></div>
        <div className="how-step"><Art name="coins" alt="A stack of matte black coins"/><h3>The spread raises your shares</h3><p>Each fill keeps a small spread in the vault, so the share price rises and every depositor earns in proportion.</p></div>
      </div>
      <p className="how-note"><Icon name="info" size={16}/>Today the first move is live on testnet. The second waits on NEAR Intents relay access, so the third has not happened yet.</p>
    </div>
  </section>;
}

function VaultsPreview(){
  const {vaults}=useStore();
  return <section className="section-in vprev">
    <div className="sec-head"><h2 className="h-sec">Pick a vault.</h2><Link to="/vaults" className="btn btn-line">All vaults <Icon name="arrow" size={16}/></Link></div>
    <div className="vtable">
      <div className="vrow vrow-head" role="row"><span>Vault</span><span className="r">Deposits</span><span className="r hide-md">Share price</span><span className="hide-md">Quotes</span><span className="r hide-md">Fee floor</span><span className="r">APY</span><span aria-hidden="true"/></div>
      {vaults.map(v=><VaultRow key={v.meta.slug} v={v}/>)}
    </div>
  </section>;
}

function Features(){
  const {vaults}=useStore();
  const rules=vaults.reduce((a,v)=>a+(val(v.state)?.constitution.allowed_pairs.length??0),0);
  return <section className="section-in feats">
    <h2 className="h-sec">Built so you can check it.</h2>
    <div className="bento">
      <article className="feat feat-dark feat-wide">
        <div><h3>Rules you vote on</h3><p>Every vault holds its rules on chain: pairs, largest trade, fee floor and a daily loss that pauses it. Depositors change them with a 24-hour, share-weighted vote.</p><span className="feat-stat"><b>{rules||'…'}</b> pairs allowed across {vaults.length} vaults</span><Link to="/governance" className="more more-light">Governance <Icon name="arrow" size={14}/></Link></div>
        <Art name="ballot" alt="A matte black ballot box with a slip in the slot"/>
      </article>
      <article className="feat"><Art name="shield" alt="A matte black shield"/><h3>Any trade, checked</h3><p>Ask the contract whether a trade fits the rules before anything is quoted. Try one on any vault page.</p></article>
      <article className="feat feat-live"><h3>The live market, next door</h3><p>Kuroko watches the real NEAR Intents market for its pair, and shows what it would quote.</p><RelayMini/></article>
      <article className="feat feat-wide2"><Art name="relay" alt="A matte black relay antenna under a spotlight"/><h3>Every number from chain</h3><p>Deposits, share prices and history are read from NEAR testnet and FastNEAR’s index. No number on this site is typed in.</p></article>
    </div>
  </section>;
}

function Honest(){
  const live=['Three vault contracts on NEAR testnet, one shared wasm','USDC deposits and proportional withdrawals','Share-weighted votes on each vault’s rules','The contract’s own trade check, callable from the page','Relay health and a live market quote, every few seconds'];
  const not=['Swap fills: the solver needs a NEAR Intents Partner JWT','Earned spread and APY: none until fills happen','A signer the vault can restrict on NEAR Intents','Mainnet. Kuroko is a testnet prototype and is not audited'];
  return <section className="honest" id="security">
    <div className="section-in">
      <h2 className="h-sec">What is live, and what is not.</h2>
      <div className="honest-grid">
        <div className="honest-col"><h3><Pulse tone="ok"/>Live today</h3><ul>{live.map(t=><li key={t}><Icon name="check" size={16}/>{t}</li>)}</ul></div>
        <div className="honest-col not"><h3><Pulse tone="warn"/>Not yet</h3><ul>{not.map(t=><li key={t}><Icon name="lock" size={16}/>{t}</li>)}</ul></div>
        <div className="honest-col facts-col"><h3>Contract facts</h3><dl>
          <div><dt>Vaults</dt><dd>{VAULTS.map(v=>v.short).join(' · ')}</dd></div>
          <div><dt>Wasm sha256</dt><dd className="mono">924312…2442</dd></div>
          <div><dt>Token</dt><dd>Circle testnet USDC (NEP-141)</dd></div>
          <div><dt>Tests</dt><dd>21 passing, incl. nearcore sandbox</dd></div>
          <div><dt>License</dt><dd>MIT</dd></div>
        </dl></div>
      </div>
    </div>
  </section>;
}

const FAQ:[string,string][]=[
  ['Where would the yield come from?','From the spread on swaps Kuroko fills. When a trader on NEAR Intents swaps USDC for wNEAR, a market maker quotes a price slightly better for itself than the market mid. Kuroko pools depositors’ USDC to be that market maker, and the spread stays in the vault.'],
  ['Why is the APY a dash?','Because no fill has happened. Kuroko does not show a projected or simulated APY. The share price stays at 1.000000 until the vault actually earns.'],
  ['What is blocked, exactly?','NEAR Intents only lets approved solvers answer quote requests. That needs a Partner JWT from the partner portal, which Kuroko does not have yet. The relay page shows the check live.'],
  ['Can I take my money out?','Yes. Withdraw burns your shares and sends your proportional USDC back in one transaction. Only while a rules vote is open do deposits and withdrawals wait, so nobody can jump in or out to swing a vote.'],
  ['Who decides the rules?','The depositors of each vault. Anyone holding shares can propose new rules; a proposal passes with more than half of all shares after 24 hours, and anyone can then execute it.'],
  ['Is this real money?','Not yet. Everything runs on NEAR testnet with Circle’s testnet USDC, and the contract has not been audited. The test accounts in the activity feed are the team’s.'],
];
function Faq(){
  return <section className="faq" id="faq">
    <div className="section-in faq-in">
      <h2 className="h-sec">Questions.</h2>
      <div className="faq-list">{FAQ.map(([q,a],i)=><details key={q} open={i===0}><summary>{q}<Icon name="plus" size={18}/></summary><p>{a}</p></details>)}</div>
    </div>
  </section>;
}

function BigFooter(){
  return <footer className="bigfoot">
    <div className="bigfoot-card">
      <div className="bigfoot-cta"><h2>Put your USDC backstage.</h2><div className="row-actions"><a href="/vault/core" onClick={go('/vault/core')} className="btn btn-accent btn-lg">Deposit USDC</a><WalletButton dark/></div></div>
      <div className="bigfoot-links">
        <div><b>Product</b><Link to="/vaults">Vaults</Link><Link to="/portfolio">Portfolio</Link><Link to="/activity">Activity</Link><Link to="/relay">Relay</Link><Link to="/governance">Governance</Link></div>
        <div><b>Build</b><a href="https://github.com/nickthelegend/kuroko-near" target="_blank" rel="noreferrer">Source</a><a href="https://docs.near-intents.org/integration/market-makers/introduction" target="_blank" rel="noreferrer">NEAR Intents</a><a href={`https://testnet.nearblocks.io/address/${VAULTS[0].id}`} target="_blank" rel="noreferrer">Core vault on NearBlocks</a></div>
        <div className="bigfoot-brand"><Mark size={40}/><span>Kuroko</span><p>The stagehand works in plain sight. So does every number here.</p></div>
      </div>
      <div className="bigfoot-base"><span>NEAR HACKATHON 2026 · testnet prototype, not audited</span><span>MIT · © 2026 Nivesh Gajengi</span></div>
    </div>
  </footer>;
}
