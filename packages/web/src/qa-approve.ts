/** QA-only "Test wallet" approval sheet. Lives in the QA signer chunk only; ordinary builds use the real Meteor popup. */
export type Approval={network:string;signer:string;receiver:string;method:string;summary:string;amount:string;gas:string};
const CSS=`.qa-sheet-back{position:fixed;inset:0;z-index:2147483000;background:rgba(14,13,12,.55);display:flex;align-items:center;justify-content:center;padding:16px;font:400 15px/1.45 var(--sans,system-ui);animation:qa-in .2s ease-out}
.qa-sheet{width:min(440px,100%);background:var(--stage,#0e0d0c);color:var(--on-stage,#f3f0e9);border:1px solid var(--stage-line,#2d2925);border-radius:20px;box-shadow:0 30px 80px -20px rgba(0,0,0,.6);overflow:hidden}
.qa-sheet header{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:var(--stage-2,#181614);border-bottom:1px solid var(--stage-line,#2d2925);font-size:12px;color:var(--on-stage-2,#a69f94)}
.qa-sheet header b{font-weight:500;letter-spacing:.02em}
.qa-sheet h3{margin:0;padding:20px 20px 4px;font-size:24px;font-weight:500;letter-spacing:-.02em}
.qa-sheet .qa-sum{padding:0 20px 14px;color:var(--accent-2,#ff7a3d);font-size:16px}
.qa-sheet dl{margin:0;padding:0 20px 8px}
.qa-sheet dl div{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-top:1px solid var(--stage-line,#2d2925)}
.qa-sheet dt{color:var(--on-stage-2,#a69f94);font-size:13px}
.qa-sheet dd{margin:0;text-align:right;font-family:var(--mono,monospace);font-size:13px;word-break:break-all}
.qa-sheet footer{display:flex;gap:10px;padding:14px 20px 20px}
.qa-sheet button{flex:1;padding:13px 0;border-radius:999px;border:1px solid var(--stage-line,#2d2925);background:transparent;color:inherit;font-weight:500;cursor:pointer}
.qa-sheet button.qa-ok{background:var(--accent,#ff5c1a);border-color:var(--accent,#ff5c1a);color:var(--accent-ink,#0e0d0c)}
@keyframes qa-in{from{opacity:0}to{opacity:1}}`;
const esc=(s:string)=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));
/** Resolves on Approve, rejects on Reject. Nothing is signed before this resolves. */
export function requestApproval(a:Approval):Promise<void>{
  return new Promise((resolve,reject)=>{
    const style=document.createElement('style');style.textContent=CSS;
    const back=document.createElement('div');back.className='qa-sheet-back';back.setAttribute('role','dialog');back.setAttribute('aria-label','Approve transaction');
    const row=(k:string,v:string)=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`;
    back.innerHTML=`<div class="qa-sheet"><header><b>Test wallet</b><span>${esc(a.network)}</span></header><h3>Approve transaction</h3><p class="qa-sum">${esc(a.summary)}</p><dl>${row('Signer',a.signer)}${row('Contract',a.receiver)}${row('Method',a.method)}${row('Attached',a.amount)}${row('Gas limit',a.gas)}</dl><footer><button class="qa-no" type="button">Reject</button><button class="qa-ok" type="button">Approve</button></footer></div>`;
    const done=()=>{back.remove();style.remove();};
    back.querySelector('.qa-no')!.addEventListener('click',()=>{done();reject(Error('QA signer: you rejected the transaction. Nothing was sent.'));});
    back.querySelector('.qa-ok')!.addEventListener('click',()=>{done();resolve();});
    document.head.append(style);document.body.append(back);
  });
}
