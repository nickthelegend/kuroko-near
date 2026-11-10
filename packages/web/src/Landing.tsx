import type {Data} from './App';
import {ago,decimal,liveRecord,navigate,nearblocksAccount,nearblocksTx,pairLabel,sharePrice,short,usdNumber,vaultId} from './rpc';
import {Art,Chip,CountUp,Empty,Icon,useNow,valueOf} from './ui';

export default function Landing({data}:{data:Data}){
  const now=useNow();
  const v=valueOf(data.vault);
  const h=valueOf(data.history);
  const c=v?.constitution;
  const open=(path:string)=>(e:React.MouseEvent)=>{e.preventDefault();navigate(path);};
  const readAt=data.vault.state==='ok'?data.vault.at:null;

  return <>
    <section className="hero">
      <div className="hero-in">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot"/>USDC vault · NEAR testnet</p>
          <h1>Deposit USDC. <span>Earn from filling other people’s swaps.</span></h1>
          <p className="lede">Every swap on NEAR Intents needs someone to fill it, and the filler keeps a small fee. Kuroko pools your USDC to be that filler, inside rules the depositors vote on, and splits the fees by your share.</p>
          <div className="cta-row">
            <a className="btn btn-kaki btn-lg" href="/vault" onClick={open('/vault')}>Open the vault <Icon name="arrow"/></a>
            <a className="btn btn-glass btn-lg" href="#real">What is live today</a>
          </div>
        </div>
        <figure className="hero-frame">
          <Art name="kuroko-hero" className="hero-art"/>
          <div className="float-card" aria-live="polite">
            <span className="fc-k">In the vault now</span>
            <span className="fc-v"><CountUp value={v?usdNumber(v.usdc_balance):null} decimals={2} suffix=" USDC"/></span>
            <span className="fc-s">{readAt?`read from chain ${ago(readAt,now)}`:data.vault.state==='error'?'chain read failed, retrying':'reading the chain…'}</span>
          </div>
        </figure>
      </div>
    </section>

    <section className="statband" aria-label="Live vault numbers">
      <div className="statband-in">
        <div className="sb"><span>Vault USDC</span><CountUp value={v?usdNumber(v.usdc_balance):null} decimals={2}/><small>held by the contract</small></div>
        <div className="sb"><span>Share price</span><CountUp value={v?usdNumber(sharePrice(v.usdc_balance,v.total_shares)):null} decimals={4}/><small>USDC per share</small></div>
        <div className="sb"><span>Depositors</span><CountUp value={h?h.depositors.size:null} decimals={0}/><small>from on-chain transfers</small></div>
        <div className="sb sb-honest"><span>Swaps filled</span><CountUp value={0} decimals={0}/><small><Chip tone="warn">Waiting on relay access</Chip></small></div>
      </div>
      {data.vault.state==='error'&&<p className="inline-error wrap" role="alert"><Icon name="x" size={16}/>{data.vault.message}</p>}
    </section>

    <section className="how" id="how">
      <div className="wrap">
        <header className="sec-head"><p className="kicker">How it works</p><h2>Three steps. You only do the first.</h2></header>
        <ol className="steps">
          <li className="step s1">
            <span className="step-n">1</span>
            <div className="step-art" aria-hidden="true"><span className="tok">USDC</span><Icon name="arrow" size={20}/><span className="tok tok-share">shares</span></div>
            <h3>You deposit USDC</h3>
            <p>The vault gives you shares for it. Your shares are your slice of everything in the vault.</p>
          </li>
          <li className="step s2">
            <span className="step-n">2</span>
            <div className="step-art" aria-hidden="true"><span className="tok tok-ghost">swap</span><Icon name="swap" size={20}/><span className="tok tok-kaki">Kuroko’s price</span></div>
            <h3>Kuroko fills swaps</h3>
            <p>Someone swaps on NEAR Intents. Kuroko offers a price that keeps a small fee, but only for pairs, sizes and fees the rules allow.</p>
          </li>
          <li className="step s3">
            <span className="step-n">3</span>
            <div className="step-art" aria-hidden="true"><span className="tok tok-moegi">+ fee</span><Icon name="arrow" size={20}/><span className="tok tok-share">share ↑</span></div>
            <h3>The fees are yours</h3>
            <p>Each fee stays in the vault, so every share is worth a bit more. Withdraw your USDC whenever you like.</p>
          </li>
        </ol>
      </div>
    </section>

    <section className="real" id="real">
      <div className="wrap real-grid">
        <div className="real-card">
          <p className="kicker">Honest status</p>
          <h2>What is real today</h2>
          <ul className="checks">
            <li className="ok"><Icon name="check" size={18}/><div><b>The vault is live on NEAR testnet</b><span>holding Circle’s testnet USDC · <a href={nearblocksAccount(vaultId)} target="_blank" rel="noreferrer">{short(vaultId,14,8)} <Icon name="external" size={12}/></a></span></div></li>
            <li className="ok"><Icon name="check" size={18}/><div><b>Deposits and withdrawals work</b><span>each one is a real testnet transaction; the latest are listed here</span></div></li>
            <li className="ok"><Icon name="check" size={18}/><div><b>The rules are checked on-chain</b><span>anyone can ask the contract whether a trade is allowed (try it on the vault page)</span></div></li>
            <li className="wait"><Icon name="clock" size={18}/><div><b>Filling real swaps</b><span>needs an approved NEAR Intents relay key. Setup required: PARTNER_JWT</span></div></li>
            <li className="wait"><Icon name="lock" size={18}/><div><b>Mainnet with real money</b><span>blocked until a signer exists that can only quote inside the rules</span></div></li>
          </ul>
        </div>
        <div className="feed-card">
          <div className="feed-head"><h3><span className="live-dot"/>Vault activity</h3><span className="muted">from the chain</span></div>
          <Feed data={data} now={now}/>
          <a className="btn btn-dark wide" href="/vault" onClick={open('/vault')}>See the vault <Icon name="arrow"/></a>
        </div>
      </div>
    </section>

    <section className="rules-band">
      <div className="wrap rules-grid">
        <Art name="kuroko-feature-curtain" className="rules-art"/>
        <div>
          <p className="kicker">You set the rules</p>
          <h2>Depositors vote on what Kuroko may do.</h2>
          <ul className="rule-list">
            <li><Icon name="layers"/><span>Only trades</span><b>{c?c.allowed_pairs.map(pairLabel).join(', '):'…'}</b></li>
            <li><Icon name="lock"/><span>Largest trade</span><b>{c?`${decimal(c.max_inventory_usdc)} USDC`:'…'}</b></li>
            <li><Icon name="scale"/><span>Smallest fee kept</span><b>{c?`${(c.min_spread_bps/100).toFixed(2)}%`:'…'}</b></li>
            <li><Icon name="shield"/><span>Pauses after a daily loss of</span><b>{c?`${decimal(c.daily_loss_limit_usdc)} USDC`:'…'}</b></li>
          </ul>
          <p className="fine">Read live from the contract. A change needs a 24-hour shareholder vote.</p>
        </div>
      </div>
    </section>

    <section className="finale">
      <div className="wrap finale-in">
        <h2>See the vault, deposit, or just watch.</h2>
        <a className="btn btn-kaki btn-lg" href="/vault" onClick={open('/vault')}>Open the vault <Icon name="arrow"/></a>
      </div>
    </section>
  </>;
}

function Feed({data,now}:{data:Data;now:number}){
  const h=valueOf(data.history);
  if(!h&&data.history.state==='loading')return <ul className="feed" aria-busy="true">{[0,1,2].map(i=><li key={i} className="feed-row sk"><span/><span/></li>)}</ul>;
  if(!h)return <p className="inline-error" role="alert"><Icon name="x" size={16}/>Activity unavailable: {data.history.state==='error'?data.history.message:''}</p>;
  if(!h.events.length)return <Empty title="No deposits yet">The vault has not received USDC since {short(liveRecord.vault,14,8)} was deployed.</Empty>;
  return <ul className="feed">{h.events.slice().reverse().slice(0,5).map(e=><li key={e.hash+e.kind} className="feed-row">
    <span className={`badge b-${e.kind}`}>{e.kind==='deposit'?<Icon name="plus" size={14}/>:<Icon name="minus" size={14}/>}</span>
    <span className="fr-main"><b>{e.kind==='deposit'?'Deposit':e.kind==='withdrawal'?'Withdrawal':'Sent out'} · {decimal(e.amount,6,2)} USDC</b><small>{short(e.account,16,8)} · {ago(e.at,now)}</small></span>
    <a className="fr-link" href={nearblocksTx(e.hash)} target="_blank" rel="noreferrer" aria-label={`Open transaction ${e.hash} on NearBlocks`}>{short(e.hash,5,4)}<Icon name="external" size={13}/></a>
  </li>)}</ul>;
}
