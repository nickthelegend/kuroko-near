import {useEffect,useState} from 'react';
import {ago,decimal,navNumber,navigate,nearblocksAccount,nearblocksTx,pairLabel,rawUnits,recentVaultTxns,short,solverState,vaultId,view,type VaultState} from './rpc';
import {Art,Chip,Cue,Empty,Icon,Num,useLive} from './ui';

const loadVault=()=>{if(!vaultId)return Promise.reject(new Error('Setup required: VITE_VAULT_ACCOUNT'));return view<VaultState>(vaultId,'state');};

function OrderCards(){
  return <div className="cards-float">
    <span className="ocard oc-1"><b>BID</b><i/><i/><i/></span>
    <span className="ocard oc-2"><b>INTENT</b><i/><i/></span>
    <span className="ocard oc-3"><b>ASK</b><i/><i/><i/></span>
    <svg className="kuroko-figure" viewBox="0 0 220 300" aria-hidden="true">
      <defs>
        <linearGradient id="kf-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#09090b"/><stop offset=".75" stopColor="#09090b"/><stop offset="1" stopColor="#09090b" stopOpacity="0"/></linearGradient>
        <linearGradient id="kf-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fd0fa" stopOpacity=".95"/><stop offset=".6" stopColor="#4fb3f2" stopOpacity=".35"/><stop offset="1" stopColor="#4fb3f2" stopOpacity="0"/></linearGradient>
      </defs>
      <path d="M104 16c-26 3-42 24-43 52-1 20 5 36 16 46-28 8-46 30-52 66L16 300h188l-9-120c-6-36-24-58-52-66 11-10 16-26 15-46-1-30-20-54-54-52Z" fill="url(#kf-fill)" stroke="url(#kf-rim)" strokeWidth="1.6"/>
    </svg>
  </div>;
}

export default function Landing(){
  const [vault]=useLive(loadVault,30000);
  const [txns]=useLive(()=>recentVaultTxns(6),30000);
  const [solver]=useLive(solverState);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),5000);return()=>clearInterval(t);},[]);
  const v=vault.state==='ok'?vault.value:null;
  const c=v?.constitution;
  const nav=navNumber(v);
  const relayLive=solver.state==='ok';
  const open=(e:React.MouseEvent)=>{e.preventDefault();navigate('/app');};

  return <>
    <section className="hero">
      <Art name="kuroko-hero" className="hero-art"><OrderCards/></Art>
      <span className="ghost-glyph" aria-hidden="true">黒子</span>
      <div className="hero-copy">
        <Cue>NEAR Intents solver vault · testnet</Cue>
        <h1>The market maker <em>behind</em> the trade.</h1>
        <p className="lede">Depositors pool USDC. A solver fills other people's NEAR Intents swaps and keeps the spread. Every quote must pass a constitution the shareholders vote on: which pairs, how much inventory, the smallest spread, the worst day.</p>
        <div className="cta-row">
          <a className="btn btn-primary" href="/app" onClick={open}>Open the terminal <Icon name="arrow"/></a>
          <a className="btn btn-ghost" href="#constitution"><Icon name="scale"/>Read the constitution</a>
        </div>
      </div>
      <div className="hero-foot">
        <span className="hf-item"><span>Vault</span>{vaultId?<a href={nearblocksAccount(vaultId)} target="_blank" rel="noreferrer"><code>{short(vaultId,18,9)}</code><Icon name="external" size={13}/></a>:<Chip tone="warn">Setup required: VITE_VAULT_ACCOUNT</Chip>}</span>
        <span className="hf-item"><span>Relay</span>{relayLive?<Chip tone="live">Listening</Chip>:<Chip tone="warn">Setup required: PARTNER_JWT</Chip>}</span>
        <span className="hf-item"><span>Quoting</span><Chip>Off · listen only</Chip></span>
      </div>
    </section>

    <section className="proof" id="proof" aria-label="Live vault state">
      <div className="sec-head">
        <Cue n="00">Live on NEAR testnet</Cue>
        <p>Read from the vault contract every 30 seconds and from NearBlocks. Nothing here is typed by hand.</p>
      </div>
      <div className="stats">
        <div className="stat"><span>Vault USDC</span><Num value={v?decimal(v.usdc_balance)||'0':null} unit="USDC" dim={v?.usdc_balance==='0'}/><small>cash held by the contract</small></div>
        <div className="stat"><span>Shares outstanding</span><Num value={v?decimal(v.total_shares)||'0':null} dim={v?.total_shares==='0'}/><small>minted to depositors</small></div>
        <div className="stat"><span>NAV per share</span><Num value={nav?.value??null} unit="USDC"/><small>{nav?.genesis?'genesis price · first deposit mints 1:1':'cash ÷ shares'}</small></div>
        <div className="stat"><span>Verified fills</span><Num value="0" dim/><small>quoting is off until relay access</small></div>
      </div>
      {vault.state==='error'&&<p className="inline-error" role="alert"><Icon name="x" size={16}/>{vault.message}</p>}
      <div className="ticker" aria-label="Current constitution">
        <span className="tk"><b>Pairs</b>{c?c.allowed_pairs.map(pairLabel).join(', ')||'none':'…'}</span>
        <span className="tk"><b>Max inventory</b>{c?`${decimal(c.max_inventory_usdc)} USDC`:'…'}</span>
        <span className="tk"><b>Min spread</b>{c?`${c.min_spread_bps} bps`:'…'}</span>
        <span className="tk"><b>Daily loss limit</b>{c?`${decimal(c.daily_loss_limit_usdc)} USDC`:'…'}</span>
        <span className="tk"><b>State</b>{v?(v.paused?'Paused':'Open'):'…'}</span>
      </div>
      <div className="txfeed">
        <div className="txfeed-head"><span>Recent vault transactions</span><span>NearBlocks v3</span></div>
        {txns.state==='loading'&&<div className="txrow skeleton" aria-busy="true"><span/><span/><span/></div>}
        {txns.state==='error'&&<p className="inline-error" role="alert"><Icon name="x" size={16}/>Transactions unavailable: {txns.message}</p>}
        {txns.state==='ok'&&txns.value.length===0&&<Empty title="No transactions yet">The vault has not been called since deployment.</Empty>}
        {txns.state==='ok'&&txns.value.map(t=><a key={t.hash} className="txrow" href={nearblocksTx(t.hash)} target="_blank" rel="noreferrer">
          <span className="tx-method">{t.method}</span>
          <span className="tx-signer">{short(t.signer,16,8)}</span>
          <Chip tone={t.ok?'live':'bad'}>{t.ok?'Success':'Failed'}</Chip>
          <span className="tx-age">{ago(t.ns,now)}</span>
          <span className="tx-hash">{short(t.hash,6,4)}<Icon name="external" size={13}/></span>
        </a>)}
      </div>
    </section>

    <section className="earn" id="earn">
      <div className="earn-grid">
        <div>
          <Cue n="幕">How a solver earns the spread</Cue>
          <h2>Three beats. <span>The stagehand never takes a bow.</span></h2>
          <p className="sec-lede">In kabuki the kuroko moves the scenery in plain sight and the audience agrees not to see them. A solver does the same for a swap.</p>
        </div>
        <Art name="kuroko-feature-stage" className="feature-art"><div className="lineup"><span className="ocard"><b>I · ASK</b><i/><i/><i/></span><span className="ocard"><b>II · QUOTE</b><i/><i/><i/></span><span className="ocard"><b>III · SETTLE</b><i/><i/></span></div></Art>
      </div>
      <ol className="beats">
        <li><span className="beat-n">I</span><h3>A request walks on</h3><p>A user asks NEAR Intents to swap. The solver relay broadcasts the request to market makers who hold relay access.</p><code>quote · nep141 in → out</code></li>
        <li><span className="beat-n">II</span><h3>Kuroko quotes inside the rules</h3><p>The price comes from the vault's inventory curve plus at least the minimum spread. The pair, inventory cap and daily loss limit are checked before any quote.</p><code>check_trade(pair, inventory, spread)</code></li>
        <li><span className="beat-n">III</span><h3>The best quote settles</h3><p>The user signs the winning quote and <code className="inline">intents.near</code> settles both legs at once. The spread stays with the vault and lifts the share price.</p><code>NAV = cash ÷ shares</code></li>
      </ol>
      <p className="honest"><Icon name="flag" size={16}/>Today Kuroko runs beat I in listen-only mode at most. It sends no quotes and has no fills until relay access and a restricted signer are in place.</p>
    </section>

    <section className="constitution" id="constitution">
      <Art name="kuroko-feature-curtain" className="curtain-art"/>
      <div className="const-inner">
        <Cue n="法">The constitution</Cue>
        <h2>Shareholders write the rules. <span>The solver can only perform them.</span></h2>
        <div className="rules">
          <article className="rule"><Icon name="layers"/><h3>Allowed pairs</h3><p>The only markets the solver may quote.</p><strong>{c?c.allowed_pairs.map(pairLabel).join(', ')||'None':'…'}</strong></article>
          <article className="rule"><Icon name="lock"/><h3>Max inventory</h3><p>The most USDC that may sit on one side of the book.</p><strong>{c?decimal(c.max_inventory_usdc):'…'} <em>USDC</em></strong></article>
          <article className="rule"><Icon name="scale"/><h3>Minimum spread</h3><p>No quote tighter than this, so every fill earns something.</p><strong>{c?c.min_spread_bps:'…'} <em>bps</em></strong></article>
          <article className="rule"><Icon name="shield"/><h3>Daily loss limit</h3><p>When recorded losses reach it, the vault pauses itself.</p><strong>{c?decimal(c.daily_loss_limit_usdc):'…'} <em>USDC</em></strong></article>
        </div>
        <div className="const-split">
          <div className="flow">
            <h3>How the rules change</h3>
            <ol>
              <li><b>Propose</b><span>Any shareholder submits a complete replacement constitution.</span></li>
              <li><b>Vote · 24 h</b><span>Votes weigh by shares. Deposits and withdrawals lock while the vote is open, so nobody can buy a vote.</span></li>
              <li><b>Execute</b><span>It passes only with more yes than no and a majority of all shares at the snapshot.</span></li>
            </ol>
          </div>
          <TradeCheck pairs={c?.allowed_pairs??[]} minSpread={c?.min_spread_bps}/>
        </div>
      </div>
    </section>

    <section className="tech" id="tech">
      <div className="sec-head wide">
        <Cue n="技">NEAR tech, concretely</Cue>
        <h2>What each NEAR piece does here, <span>and what is still missing.</span></h2>
      </div>
      <div className="tech-grid">
        <article className="tcard">
          <header><Icon name="pulse"/><Chip tone={relayLive?'live':'warn'}>{relayLive?'Listening':'Setup required: PARTNER_JWT'}</Chip></header>
          <h3>Intents solver relay</h3>
          <p>The solver opens the authenticated Message Bus WebSocket, subscribes to quote requests and reads its own reserves from <code>intents.near</code>. It runs in listen mode: it computes what it would quote and sends nothing.</p>
          <footer>mainnet only · Partner JWT required</footer>
        </article>
        <article className="tcard">
          <header><Icon name="key"/><Chip>Not claimed</Chip></header>
          <h3>Function-call quote key</h3>
          <p>A function-call key limits which NEAR transactions a key can send. It does not limit off-chain intent signatures, so a registered key could still sign outside the constitution. Kuroko does not claim a restricted signer until that gap is closed.</p>
          <footer>see docs/RESEARCH.md</footer>
        </article>
        <article className="tcard">
          <header><Icon name="eye"/><Chip>Not built</Chip></header>
          <h3>Price guard</h3>
          <p>Before quoting, compare the request with a fresh price and refuse flow that knows more than the book. Pyth Core has ended NEAR support (<code>pyth-oracle.testnet</code> returns null), so the plan is the Rhea price oracle on mainnet and a signed relayer price on testnet. Neither is built; no price is read today.</p>
          <footer>Rhea oracle on mainnet · relayer price on testnet · not built</footer>
        </article>
        <article className="tcard">
          <header><Icon name="layers"/><Chip tone="live">Live on testnet</Chip></header>
          <h3>NEP-141 vault shares</h3>
          <p>Depositors send USDC with <code>ft_transfer_call</code>; the vault mints shares at cash NAV and burns them on withdrawal. Tested against a real NEP-141 token in a local nearcore sandbox.</p>
          <footer>{vaultId?<a href={nearblocksAccount(vaultId)} target="_blank" rel="noreferrer">contract on NearBlocks <Icon name="external" size={12}/></a>:'Setup required: VITE_VAULT_ACCOUNT'}</footer>
        </article>
      </div>
    </section>

    <section className="finale">
      <Art name="kuroko-og" className="finale-art"/>
      <div className="finale-copy">
        <h2>Step behind the curtain.</h2>
        <p>Watch the tape, read the vault and vote on the rules from one terminal.</p>
        <a className="btn btn-primary" href="/app" onClick={open}>Open the terminal <Icon name="arrow"/></a>
      </div>
    </section>
  </>;
}

const OFF_LIST='nep141:usdc.testnet/nep141:eth.testnet';
/** Calls the vault's check_trade view on testnet with the visitor's inputs. */
function TradeCheck({pairs,minSpread}:{pairs:string[];minSpread?:number}){
  const [pair,setPair]=useState('');
  const [inv,setInv]=useState('0.5');
  const [spread,setSpread]=useState('');
  const [res,setRes]=useState<{state:'idle'|'busy'}|{state:'ok';pass:boolean;for:string}|{state:'error';message:string}>({state:'idle'});
  useEffect(()=>{if(!pair&&pairs[0])setPair(pairs[0]);},[pairs,pair]);
  useEffect(()=>{if(!spread&&minSpread!==undefined)setSpread(String(minSpread));},[minSpread,spread]);
  async function ask(e:React.FormEvent){
    e.preventDefault();
    try{
      if(!vaultId)throw new Error('Setup required: VITE_VAULT_ACCOUNT');
      const bps=Number(spread);if(!Number.isInteger(bps)||bps<0||bps>9999)throw new Error('Spread must be a whole number of bps from 0 to 9999');
      setRes({state:'busy'});
      const pass=await view<boolean>(vaultId,'check_trade',{pair,inventory_usdc:rawUnits(inv),spread_bps:bps});
      setRes({state:'ok',pass,for:`${pairLabel(pair)} · ${inv} USDC · ${bps} bps`});
    }catch(err){setRes({state:'error',message:(err as Error).message});}
  }
  return <form className="ask" onSubmit={ask}>
    <h3>Ask the vault</h3>
    <p>Would this quote pass? This calls <code>check_trade</code> on the testnet contract.</p>
    <label className="field"><span>Pair</span>
      <select value={pair} onChange={e=>{setPair(e.target.value);setRes({state:'idle'});}}>
        {pairs.map(p=><option key={p} value={p}>{pairLabel(p)}</option>)}
        {!pairs.includes(OFF_LIST)&&<option value={OFF_LIST}>{pairLabel(OFF_LIST)} · not listed</option>}
      </select>
    </label>
    <div className="field-row">
      <label className="field"><span>Inventory · USDC</span><input inputMode="decimal" value={inv} onChange={e=>{setInv(e.target.value);setRes({state:'idle'});}}/></label>
      <label className="field"><span>Spread · bps</span><input inputMode="numeric" value={spread} onChange={e=>{setSpread(e.target.value);setRes({state:'idle'});}}/></label>
    </div>
    <button className="btn btn-primary" disabled={res.state==='busy'||!pairs.length}>{res.state==='busy'?'Asking the chain…':'Check on testnet'}</button>
    <div className="ask-out" aria-live="polite">
      {res.state==='ok'&&<p className={res.pass?'pass':'fail'}><Icon name={res.pass?'check':'x'} size={16}/>{res.pass?'Passes':'Refused'} · <span>{res.for}</span></p>}
      {res.state==='error'&&<p className="fail" role="alert"><Icon name="x" size={16}/>{res.message}</p>}
    </div>
  </form>;
}
