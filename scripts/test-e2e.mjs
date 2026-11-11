// Real browser signing. The secret is read once in Node and injected only into browser memory.
// No traces, videos, storage-state dumps, console text, credential objects, or error stacks are saved.
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,basename} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createServer} from 'node:net';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {JsonRpcProvider} from 'near-api-js';

const root=fileURLToPath(new URL('../',import.meta.url));
const scratch='/private/tmp/claude-501/-Volumes-Extreme-SSD-Projects-grokbot/0f121b7c-0081-4ec0-81a9-0ccb4f7f8b48/scratchpad';
const out=join(scratch,'flow-qa/kuroko/qa-signer');
const {withChromeLock}=await import(pathToFileURL(join(scratch,'chrome-lock.mjs')).href);
const live=JSON.parse(readFileSync(join(root,'deployments/testnet-live.json'),'utf8'));
const CAP=300000000000000000000000n,GAS=100000000000000n,AMOUNT=10000n;
const rpc='https://test.rpc.fastnear.com';
assert.equal(live.network,'testnet');assert.equal(live.rpcUrl,rpc);assert.ok(live.lp.endsWith('.testnet')&&live.vault.endsWith('.testnet'));
const provider=new JsonRpcProvider({url:rpc});
const date=new Date().toISOString().slice(0,10),recordFile=join(root,`deployments/qa-browser-${date}.json`);
const record=existsSync(recordFile)?JSON.parse(readFileSync(recordFile,'utf8')):{network:'testnet',rpcUrl:rpc,vault:live.vault,depositor:live.lp,capYocto:CAP.toString(),transactions:[],runs:[]};
assert.equal(record.network,'testnet');assert.equal(record.depositor,live.lp);assert.equal(record.capYocto,CAP.toString());
const save=()=>writeFileSync(recordFile,JSON.stringify(record,null,2)+'\n');
const charged=()=>record.transactions.reduce((sum,t)=>sum+BigInt(t.status==='final'?t.spentYocto:t.reservedYocto),0n);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let server,browser,credential;
const resumable=record.runs.findLast(r=>r.status==='FAILED'&&record.transactions.some(t=>t.runId===r.id&&t.method==='ft_transfer_call'&&t.status==='final'&&!record.transactions.some(w=>w.runId===r.id&&w.width===t.width&&w.method==='withdraw'&&w.status==='final')));
const run=resumable??{id:randomUUID(),startedAt:new Date().toISOString(),steps:[]};
if(resumable){run.resumedAt=new Date().toISOString();run.previousFailureScreenshot=run.failureScreenshot;}
run.status='RUNNING';
async function view(account_id,method_name,args={}){const r=await provider.query({request_type:'call_function',finality:'final',account_id,method_name,args_base64:Buffer.from(JSON.stringify(args)).toString('base64')});return JSON.parse(Buffer.from(r.result).toString());}
const accountBalance=account_id=>provider.query({request_type:'view_account',finality:'final',account_id});
async function snapshot(){return {state:await view(live.vault,'state'),shares:await view(live.vault,'shares_of',{account_id:live.lp}),usdc:await view(live.usdc,'ft_balance_of',{account_id:live.lp}),native:await accountBalance(live.lp),vaultNative:await accountBalance(live.vault)};}
const available=a=>BigInt(a.amount)-BigInt(a.storage_usage)*10000000000000000000n;
async function preflight(){
 if(record.transactions.some(t=>t.status!=='final'))throw Error('STOP: a previous browser transaction has unresolved reserved budget. Inspect its recorded hash before retrying.');
 const s=await snapshot(),proposals=await view(live.vault,'proposals');
 if(s.state.paused||proposals.some(p=>!p.executed&&p.closes_at_ms>Date.now()))throw Error('STOP: the demo vault is paused or voting is open.');
 const gasPrice=BigInt((await provider.sendJsonRpc('gas_price',[null])).gas_price);
 const worst=(GAS*gasPrice+2n)*4n;
 if(charged()+worst>CAP)throw Error('STOP: four browser transactions would exceed the remaining 0.3 NEAR budget.');
 if(available(s.native)<worst+10000000000000000000000n||available(s.vaultNative)<10000000000000000000000n||BigInt(s.usdc)<AMOUNT)throw Error('STOP: demo balances are low. Need 0.01 USDC plus reserved gas and 0.01 NEAR headroom; no transaction was sent.');
 return s;
}
async function beforeBuild(){
 if(process.platform!=='darwin')return;
 for(;;){const swap=execFileSync('sysctl',['vm.swapusage'],{encoding:'utf8'});console.log(swap.trim());const free=Number(swap.match(/free\s*=\s*([\d.]+)M/)?.[1]);if(!Number.isFinite(free))throw Error('STOP: cannot read swap free.');if(free>=500)return;console.log('Swap free below 500 MB; waiting two minutes before building.');await delay(60000);await delay(60000);}
}
async function command(args,env,log){
 await beforeBuild();const child=spawn('pnpm',args,{cwd:root,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);const code=await new Promise(r=>child.on('exit',r));writeFileSync(join(out,log),output);if(code!==0)throw Error(`STOP: build failed; inspect ${log}.`);
}
async function freePort(){for(let port=5389;port<6000;port++){if(port===5432)continue;const free=await new Promise(resolve=>{const s=createServer();s.once('error',()=>resolve(false));s.listen(port,'127.0.0.1',()=>s.close(()=>resolve(true)));});if(free)return port;}throw Error('STOP: no free preview port in 5300-5999.');}
async function startPreview(dir){
 const port=await freePort();
 const vite=join(root,'packages/web/node_modules/vite/bin/vite.js');
 server=spawn(process.execPath,[vite,'preview','--host','127.0.0.1','--port',String(port),'--strictPort','--outDir',dir],{cwd:join(root,'packages/web'),env:{...process.env,VITE_QA_SIGNER:'0'},stdio:'ignore',detached:true});
 const url=`http://127.0.0.1:${port}`;
 for(let i=0;i<60;i++){if(server.exitCode!==null)break;try{if((await fetch(url)).ok){console.log(`Preview ready on ${port}`);return url;}}catch{}await delay(250);}
 throw Error('STOP: preview server did not start.');
}
async function stopPreview(){if(!server)return;const child=server;server=undefined;try{process.kill(-child.pid,'SIGTERM')}catch{}if(child.exitCode===null)await Promise.race([new Promise(r=>child.once('exit',r)),delay(3000)]);}
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(join(dir,d.name)):[join(dir,d.name)]);}
function verifyProduction(dir){
 const assets=files(dir);const bad=assets.filter(f=>/qa-signer/i.test(basename(f))||(/\.(js|html)$/.test(f)&&/qa-signer|__KUROKO_QA|QA signer/.test(readFileSync(f,'utf8'))));
 assert.equal(bad.length,0,'Production contains a QA signer marker');
 record.productionIsolation={passed:true,mode:'production',flagDuringBuild:'1',markers:['qa-signer','__KUROKO_QA','QA signer'],matchingFiles:0};
}
async function reserve(request,width){
 assert.ok([live.vault,live.usdc].includes(request.receiverId));assert.deepEqual(request.methods,request.receiverId===live.usdc?['ft_transfer_call']:['withdraw']);
 const gasPrice=BigInt((await provider.sendJsonRpc('gas_price',[null])).gas_price),expected=GAS*gasPrice+2n;
 const requested=BigInt(request.reservedYocto);if(requested<1n||requested>CAP)throw Error('QA signer reservation is invalid.');
 const amount=requested>expected?requested:expected;
 if(charged()+amount>CAP)throw Error('QA signer would exceed the shared 0.3 NEAR budget.');
 const native=await accountBalance(live.lp);if(available(native)<amount+10000000000000000000000n)throw Error('QA signer account balance is low.');
 const ticket=randomUUID();record.transactions.push({ticket,runId:run.id,width,receiverId:request.receiverId,method:request.methods[0],amountRaw:AMOUNT.toString(),reservedYocto:amount.toString(),status:'reserved'});save();return ticket;
}
async function receipt(ticket,hash){
 assert.match(hash,/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
 const t=record.transactions.find(t=>t.ticket===ticket);assert.ok(t&&t.runId===run.id&&!t.hash);t.hash=hash;t.explorer=`https://testnet.nearblocks.io/txns/${hash}`;t.status='submitted';save();
 const tx=await provider.sendJsonRpc('tx',{tx_hash:hash,sender_account_id:live.lp,wait_until:'FINAL'});
 const outcomes=[tx.transaction_outcome,...tx.receipts_outcome];
 t.receiptFailures=outcomes.filter(o=>typeof o.outcome.status==='object'&&'Failure' in o.outcome.status).length;
 t.spentYocto=(outcomes.reduce((sum,o)=>sum+BigInt(o.outcome.tokens_burnt),0n)+2n).toString(); // includes attached token/withdraw yocto conservatively
 t.status='final';t.finalStatus=tx.status;t.observedAt=new Date().toISOString();save();
 assert.equal(t.receiptFailures,0,'A real testnet receipt failed');assert.ok(charged()<=CAP,'QA budget exceeded');console.log(`${t.method} (${t.width}): ${hash}`);
}
const formatShares=raw=>(Number(raw)/1e6).toFixed(4);
async function walk(width,url){
 const context=await browser.newContext({viewport:{width,height:width===1440?900:812},reducedMotion:'reduce'});
 try{
  const page=await context.newPage();let errors=0,failed=0,httpErrors=0;
  page.on('pageerror',()=>errors++);page.on('console',m=>{if(m.type()==='error')errors++});page.on('requestfailed',()=>failed++);page.on('response',r=>{if(r.status()>=400)httpErrors++});
  await page.exposeBinding('__KUROKO_QA_RESERVE',(_,r)=>reserve(r,width));
  await page.exposeBinding('__KUROKO_QA_RECEIPT',(_,ticket,hash)=>receipt(ticket,hash));
  // The argument is sent directly to Chrome. Never write it to a file, log, trace or storageState.
  await page.addInitScript(input=>{window.__KUROKO_QA_SIGNER_INPUT=input;},{accountId:live.lp,secretKey:credential.secret_key,rpcUrl:rpc});
  async function shot(name){
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=0,'Horizontal overflow');
   const text=await page.locator('body').innerText();assert.ok(!/undefined|\bNaN\b|TypeError|Unexpected end of JSON/.test(text),'Raw browser error text');
   assert.equal(errors,0,'Unexpected browser error');assert.equal(failed,0,'Unexpected failed request');assert.equal(httpErrors,0,'Unexpected HTTP error');
   const path=join(out,`${run.id}-${name}-${width}.png`);await page.screenshot({path,fullPage:true});
   run.steps.push({width,name,screenshot:path,overflow,consoleOrPageErrors:errors,failedRequests:failed,httpErrors});save();console.log(`PASS ${name} ${width}`);
  }
  async function position(expected,hash,name){
   await page.locator('nav').getByRole('link',{name:'Position',exact:true}).click();
   const shares=page.locator('.stat').filter({has:page.locator('.stat-label',{hasText:/^Shares$/})}).locator('.stat-value');
   await page.waitForFunction(({expected})=>[...document.querySelectorAll('.stat')].find(e=>e.querySelector('.stat-label')?.textContent==='Shares')?.querySelector('.stat-value')?.textContent===expected,{expected:formatShares(expected)},{timeout:90000});
   assert.equal(await shares.innerText(),formatShares(expected));
   await page.locator(`a[href="https://testnet.nearblocks.io/txns/${hash}"]`).waitFor({timeout:120000});
   const earned=page.locator('.stat').filter({has:page.locator('.stat-label',{hasText:/^Earned$/})}).locator('.stat-value');
   await page.waitForFunction(()=>[...document.querySelectorAll('.stat')].find(e=>e.querySelector('.stat-label')?.textContent==='Earned')?.querySelector('.stat-value')?.textContent?.trim()==='0.00 USDC',null,{timeout:90000});
   assert.equal((await earned.innerText()).replace(/\s+/g,' ').trim(),'0.00 USDC');
   await shot(name);
  }
  const priorDeposit=record.transactions.findLast(t=>t.runId===run.id&&t.width===width&&t.method==='ft_transfer_call'&&t.status==='final');
  const priorWithdrawal=record.transactions.some(t=>t.runId===run.id&&t.width===width&&t.method==='withdraw'&&t.status==='final');
  const resumeDeposit=priorDeposit&&!priorWithdrawal;
  const initial=resumeDeposit?run.steps.find(s=>s.width===width&&s.name==='before').snapshot:await snapshot();run.steps.push({width,name:resumeDeposit?'resume-before':'before',snapshot:initial});save();
  await page.goto(url);await page.locator('.table tbody tr').first().waitFor({timeout:30000});await shot('home');
  await page.locator('header button').first().click();await page.getByTitle('Disconnect wallet',{exact:true}).waitFor();await shot('connected');
  assert.equal(await page.evaluate(()=>window.__KUROKO_QA_SIGNER_INPUT===undefined),true,'Injection was not consumed');
  const minted=BigInt(initial.state.total_shares)===0n?AMOUNT:AMOUNT*BigInt(initial.state.total_shares)/BigInt(initial.state.usdc_balance);assert.ok(minted>0n);
  let depositHash;
  if(resumeDeposit){
   depositHash=priorDeposit.hash;console.log(`Resuming confirmed deposit ${depositHash}; it will not be replayed.`);
  }else{
   await page.getByLabel('USDC amount').fill('0.01');await shot('deposit-input');await page.getByRole('button',{name:'Deposit',exact:true}).click();
   const depositStatus=page.getByRole('status').filter({hasText:'Deposit confirmed'});await depositStatus.waitFor({timeout:90000});
   depositHash=(await depositStatus.locator('a').getAttribute('href')).split('/').at(-1);assert.ok(record.transactions.some(t=>t.hash===depositHash&&t.status==='final'));await shot('deposit-confirmed');
  }
  const deposited=await snapshot();assert.equal(BigInt(deposited.shares),BigInt(initial.shares)+minted);assert.equal(BigInt(deposited.usdc),BigInt(initial.usdc)-AMOUNT);
  await position(deposited.shares,depositHash,'position-after-deposit');
  await page.locator('nav').getByRole('link',{name:'Vault',exact:true}).click();await page.getByRole('tab',{name:'Withdraw',exact:true}).click();
  await page.getByLabel('Shares to redeem').fill((Number(minted)/1e6).toString());await shot('withdraw-input');await page.getByRole('button',{name:'Withdraw',exact:true}).click();
  const withdrawalStatus=page.getByRole('status').filter({hasText:'Withdrawal confirmed'});await withdrawalStatus.waitFor({timeout:90000});
  const withdrawalHash=(await withdrawalStatus.locator('a').getAttribute('href')).split('/').at(-1);assert.ok(record.transactions.some(t=>t.hash===withdrawalHash&&t.status==='final'));await shot('withdrawal-confirmed');
  const final=await snapshot();assert.equal(final.shares,initial.shares);assert.equal(final.usdc,initial.usdc);assert.equal(final.state.usdc_balance,initial.state.usdc_balance);assert.equal(final.state.total_shares,initial.state.total_shares);
  await position(initial.shares,withdrawalHash,'position-after-withdrawal');
  await page.getByTitle('Disconnect wallet',{exact:true}).click();await page.getByPlaceholder('name.testnet').waitFor();await shot('disconnected');
  // In-memory key store only: the QA adapter must never create browser-storage credentials.
  assert.equal(await page.evaluate(()=>localStorage.length),0,'QA signer used localStorage');
  assert.equal(await page.evaluate(()=>sessionStorage.length),0,'QA signer used sessionStorage');
  run.steps.push({width,name:'reconciled',before:initial,after:final});save();
 }catch{
  const pages=context.pages();const current=pages.at(-1);if(current){const path=join(out,`${run.id}-failure-${width}.png`);await current.screenshot({path,fullPage:true}).catch(()=>{});run.failureScreenshot=path;run.failureUiAlerts=await current.getByRole('alert').allTextContents().catch(()=>[]);save();}
  throw Error('Browser E2E failed.');
 }finally{await context.close();}
}
try{
 mkdirSync(out,{recursive:true});await preflight();if(!record.runs.includes(run))record.runs.push(run);save();
 const prodDir=join(out,'production-build'),qaDir=join(out,'qa-build');
 // Ordinary production mode must exclude the signer even with the environment flag accidentally set.
 await command(['--filter','@kuroko/web','exec','vite','build','--outDir',prodDir,'--emptyOutDir'],{VITE_QA_SIGNER:'1'},'production-build.log');verifyProduction(prodDir);save();
 await command(['--filter','@kuroko/web','exec','vite','build','--mode','qa','--outDir',qaDir,'--emptyOutDir'],{VITE_QA_SIGNER:'1',VITE_VAULT_ACCOUNT:live.vault,VITE_USDC_ACCOUNT:live.usdc,VITE_TESTNET_RPC_URL:rpc},'qa-build.log');
 assert.ok(files(qaDir).some(f=>/qa-signer/.test(basename(f))),'QA build did not include the signer');
 await withChromeLock(async()=>{
  browser=await chromium.launch({channel:'chrome',headless:true});
  try{
   const prodUrl=await startPreview(prodDir);
   for(const width of [1440,375]){const page=await browser.newPage({viewport:{width,height:width===1440?900:812},reducedMotion:'reduce'});await page.goto(prodUrl);await page.locator('.table tbody tr').first().waitFor({timeout:30000});const path=join(out,`after-production-home-${width}.png`);await page.screenshot({path,fullPage:true});run.steps.push({width,name:'production-home',screenshot:path});await page.close();}await stopPreview();
   await preflight(); // Check balances again immediately before accessing any signer.
   try{credential=JSON.parse(readFileSync(join(root,`.near-credentials/${live.lp}.json`),'utf8'));}catch{throw Error('STOP: could not load the existing testnet credential.');}
   assert.equal(credential.account_id,live.lp,'Credential account mismatch');
   const qaUrl=await startPreview(qaDir);for(const width of [1440,375])if(!run.steps.some(s=>s.width===width&&s.name==='reconciled'))await walk(width,qaUrl);
   credential.secret_key='';credential=undefined;
  }finally{await browser.close();browser=undefined;await stopPreview();}
 });
 run.finishedAt=new Date().toISOString();run.status='PASS';if(run.reason){run.previousFailureReason=run.reason;delete run.reason;}delete run.failureScreenshot;delete run.failureUiAlerts;record.spentYocto=charged().toString();save();console.log(`PASS: real browser flow at 1440/375; budget charged ${record.spentYocto} yoctoNEAR. Production contains no QA signer.`);
}catch(e){
 if(credential)credential.secret_key='';
 run.status='FAILED';run.reason=e instanceof Error&&e.message.startsWith('STOP:')?e.message:'Browser E2E failed. Inspect the recorded public transactions and screenshots; secret-bearing errors are not printed.';
 if(record.runs.includes(run))save();console.error(run.reason);process.exitCode=1;
}finally{if(browser)await browser.close();await stopPreview();}
