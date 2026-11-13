import {useEffect,useState} from 'react';
import {Link} from '../App';
import {useStore,val} from '../store';
import {usd} from '../derive';
import {marketQuote,probeRelay,RELAY_RPC,type MarketQuote,type Probe} from '../market';
import {solverState,solverUrl,type SolverState} from '../rpc';
import {Art,Empty,Icon,Num,Pulse,Skel,agoShort,useNow} from '../ui';
import {Token} from '../tokens';

/** Session-long probe history, kept outside React so it survives page changes. */
const probes:Probe[]=[];
const quotes:MarketQuote[]=[];
type Sub=()=>void;const subs=new Set<Sub>();
let timers:number[]=[];
function start(){
  if(timers.length)return;
  const runProbe=()=>probeRelay().then(p=>{probes.push(p);if(probes.length>40)probes.shift();subs.forEach(f=>f());});
  const runQuote=()=>marketQuote().then(q=>{quotes.push(q);if(quotes.length>30)quotes.shift();lastQuoteError='';subs.forEach(f=>f());}).catch(e=>{lastQuoteError=(e as Error).message;subs.forEach(f=>f());});
  runProbe();runQuote();
  timers=[window.setInterval(runProbe,6000),window.setInterval(runQuote,20000)];
}
let lastQuoteError='';
function useRelayFeed(){
  const [,setT]=useState(0);
  useEffect(()=>{start();const f=()=>setT(t=>t+1);subs.add(f);return()=>{subs.delete(f);};},[]);
  return {probe:probes.at(-1),probes,quote:quotes.at(-1),quotes,quoteError:lastQuoteError};
}

/** The one place the BLOCKED solver is shown in full: every link from vault to trader, checked live. */
export default function Relay(){
  const {vaults,totals}=useStore();
  const {probe,probes:ps,quote,quoteError}=useRelayFeed();
  const now=useNow(1000);
  const core=val(vaults[0].state);
  const floor=core?.constitution.min_spread_bps??30;
  const kurokoOut=quote?quote.amountIn*quote.usdcUsd/quote.nearUsd*(1-floor/10000):null;
  const nextQuote=quote?Math.max(0,20-Math.floor((now-quote.at)/1000)):null;
  return <div className="page relay-page">
    <header className="page-head">
      <div><h1>Solver relay</h1><p className="lede">Kuroko earns by answering swap requests on NEAR Intents with a price inside the vault’s rules. This page checks each link of that chain live. One link is missing: relay access.</p></div>
      <span className="live-chip chip-blocked"><Pulse tone="warn"/>Solver blocked: PARTNER_JWT</span>
    </header>

    <section className="pipe" aria-label="How a fill would flow">
      <div className="pipe-node live">
        <span className="pipe-k">Vaults</span>
        <b>{totals.ready?<Num value={usd(totals.cash)} dp={2} unit="USDC"/>:'…'}</b>
        <span className="pipe-s"><Pulse tone="ok"/>{vaults.length} contracts on testnet</span>
      </div>
      <div className="pipe-link broken" aria-hidden="true"><i/></div>
      <div className="pipe-node blocked">
        <span className="pipe-k">Kuroko solver</span>
        <b>Waiting in the wings</b>
        <span className="pipe-s"><Pulse tone="warn"/>Needs PARTNER_JWT</span>
      </div>
      <div className="pipe-link broken" aria-hidden="true"><i/></div>
      <div className={`pipe-node ${probe?.ok?'live':'down'}`}>
        <span className="pipe-k">NEAR Intents relay</span>
        <b>{probe?probe.ok?`Up · ${probe.ms} ms`:'No answer':'Probing…'}</b>
        <span className="pipe-s"><Pulse tone={!probe?'off':probe.ok?'ok':'bad'}/>{probe?`checked ${agoShort(probe.at,now)}`:'…'}</span>
      </div>
      <div className="pipe-link live" aria-hidden="true"><i/></div>
      <div className={`pipe-node ${quote?'live':quoteError?'down':''}`}>
        <span className="pipe-k">Traders’ swaps</span>
        <b>{quote?<>100 USDC → <Num value={quote.amountOut} dp={2}/> wNEAR</>:quoteError?'Unavailable':'Quoting…'}</b>
        <span className="pipe-s"><Pulse tone={quote?'ok':quoteError?'bad':'off'}/>{quote?`live market · ${agoShort(quote.at,now)}`:'…'}</span>
      </div>
    </section>

    <div className="relay-grid">
      <section className="card blocked-card">
        <Art name="curtain" alt="A heavy black stage curtain, closed, lit by an orange spotlight"/>
        <div className="blocked-body">
          <span className="tag tag-blocked">Blocked</span>
          <h2>The solver is built, but not on stage</h2>
          <p>Answering swap requests needs a NEAR Intents <b>Partner JWT</b>. Without it the relay refuses Kuroko’s solver connection, so there are no quotes, no fills and no earned spread. Nothing on this site pretends otherwise.</p>
          <ol className="checklist">
            <li className="ok"><Icon name="check" size={16}/>Listen-only relay client, quote math and rule checks <span className="muted">packages/solver, packages/sdk</span></li>
            <li className="ok"><Icon name="check" size={16}/>Vaults live on testnet with deposits, withdrawals and votes</li>
            <li className="todo"><Icon name="x" size={16}/>Partner JWT from the <a href="https://partners.near-intents.org/" target="_blank" rel="noreferrer">NEAR Intents partner portal</a> (KYC/KYB)</li>
            <li className="todo"><Icon name="x" size={16}/>Funded mainnet inventory in <code>intents.near</code></li>
            <li className="todo"><Icon name="x" size={16}/>A signer the vault can restrict (today an Intents key can sign outside the rules)</li>
          </ol>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>The market right now</h2><span className="muted">{nextQuote!=null?`refresh in ${nextQuote}s`:''}</span></div>
        {quote?<>
          <div className="quote-big"><Token name="USDC" size={30}/><span><Num value={quote.amountIn} dp={0}/> USDC</span><Icon name="arrow" size={18}/><Token name="wNEAR" size={30}/><span><Num value={quote.amountOut} dp={3}/> wNEAR</span></div>
          <dl className="facts">
            <div><dt>Reference price (1Click)</dt><dd>1 wNEAR = ${quote.nearUsd.toFixed(3)}</dd></div>
            <div><dt>Spread in this quote</dt><dd><Num value={quote.spreadBps/100} dp={2}/>%</dd></div>
            <div><dt>Kuroko Core at its {(floor/100).toFixed(2)}% floor</dt><dd>{kurokoOut!=null?<><Num value={kurokoOut} dp={3}/> wNEAR</>:'…'}</dd></div>
            <div><dt>Would that win?</dt><dd className={kurokoOut!=null&&kurokoOut>quote.amountOut?'pass':'refused'}>{kurokoOut==null?'…':kurokoOut>quote.amountOut?'Yes, it beats this quote':'No, the market is tighter'}</dd></div>
          </dl>
          <QuoteSpark qs={quotes}/>
          <p className="fine">A dry-run 1Click quote on NEAR mainnet: real solvers compete, but no deposit address is made and nothing moves. Kuroko’s line is arithmetic from the reference price and the vault’s rule, not a sent quote. The spread includes 1Click’s own fee.</p>
        </>:quoteError?<Empty art="relay" tone="err" title="Market quote unavailable">{quoteError}</Empty>:<Skel h={220} r={16}/>}
      </section>

      <section className="card">
        <div className="card-head"><h2>Relay endpoint</h2><span className="mono muted">{new URL(RELAY_RPC).host}</span></div>
        <div className="probe-big"><Pulse tone={!probe?'off':probe.ok?'ok':'bad'}/>{probe?<><Num value={probe.ms} dp={0}/> <span className="unit">ms</span></>:'…'}</div>
        <ProbeBars ps={ps}/>
        <p className="fine">Every 6 s this page sends the relay an empty JSON-RPC <code>quote</code> request; any JSON-RPC answer proves it is up. {probe?.detail}. Solvers connect over its authenticated WebSocket, which is the part that needs the JWT.</p>
      </section>

      <Listener/>
    </div>
  </div>;
}

function ProbeBars({ps}:{ps:Probe[]}){
  if(!ps.length)return <Skel h={56}/>;
  const max=Math.max(400,...ps.map(p=>p.ms));
  return <div className="bars" aria-label="Recent relay latency">{Array.from({length:40},(_,i)=>{const p=ps[ps.length-40+i];return <i key={i} className={p?p.ok?'ok':'bad':'none'} style={{height:p?`${Math.max(8,p.ms/max*100)}%`:'8%'}} title={p?`${p.ms} ms`:''}/>;})}</div>;
}
function QuoteSpark({qs}:{qs:MarketQuote[]}){
  if(qs.length<2)return <p className="fine">Collecting quotes for a trend line…</p>;
  const w=320,h=48,vals=qs.map(q=>q.amountOut),mn=Math.min(...vals),mx=Math.max(...vals),r=(mx-mn)||mx*0.001;
  const d=qs.map((q,i)=>`${i?'L':'M'}${(i/(qs.length-1))*w},${h-4-((q.amountOut-mn)/r)*(h-8)}`).join(' ');
  return <svg className="qspark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Last ${qs.length} quotes`}><path d={d} fill="none"/></svg>;
}

function Listener(){
  const [s,setS]=useState<{state:'off'}|{state:'ok';v:SolverState}|{state:'error';message:string}>({state:'off'});
  useEffect(()=>{if(!solverUrl)return;let on=true;const run=()=>solverState().then(v=>on&&setS({state:'ok',v})).catch(e=>on&&setS({state:'error',message:(e as Error).message}));run();const t=setInterval(run,5000);return()=>{on=false;clearInterval(t);};},[]);
  return <section className="card">
    <div className="card-head"><h2>Kuroko listener</h2><span className="muted">packages/solver · listen-only</span></div>
    {s.state==='ok'?<dl className="facts">
      <div><dt>Requests seen</dt><dd><Num value={s.v.requestsSeen} dp={0}/></dd></div>
      <div><dt>Would have quoted</dt><dd><Num value={s.v.wouldQuote} dp={0}/></dd></div>
      <div><dt>Quotes sent</dt><dd>{s.v.quoted}</dd></div>
      <div><dt>Fills won</dt><dd>{s.v.won}</dd></div>
    </dl>:<Empty art="relay" tone="blocked" title="Setup required: PARTNER_JWT">{s.state==='error'?`Listener: ${s.message}. `:''}With a JWT, <code>pnpm listen</code> subscribes to real quote requests and records what Kuroko would have quoted, without sending anything. Its counts appear here.</Empty>}
  </section>;
}

/** Compact status for the vault list. */
export function RelayMini(){
  const {probe,quote,quoteError}=useRelayFeed();const now=useNow(1000);
  return <div className="rmini">
    <Link to="/relay" className="rmini-row"><Pulse tone={!probe?'off':probe.ok?'ok':'bad'}/><span>NEAR Intents relay</span><b className="r">{probe?probe.ok?`${probe.ms} ms`:'down':'…'}</b></Link>
    <Link to="/relay" className="rmini-row"><Pulse tone={quote?'ok':quoteError?'bad':'off'}/><span>Live market, 100 USDC</span><b className="r">{quote?<><Num value={quote.amountOut} dp={2}/> wNEAR</>:'…'}</b></Link>
    <Link to="/relay" className="rmini-row blocked"><Pulse tone="warn"/><span>Kuroko solver</span><b className="r">Needs PARTNER_JWT</b></Link>
    <p className="fine">{probe?`Probed ${agoShort(probe.at,now)}.`:''} Fills start once relay access is granted.</p>
  </div>;
}
