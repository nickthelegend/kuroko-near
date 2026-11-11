type OutcomeStatus={SuccessValue?:string;SuccessReceiptId?:string;Failure?:unknown};
type WalletOutcome={status?:OutcomeStatus|string;transaction?:{hash?:string};receipts_outcome?:{outcome:{status:OutcomeStatus|string}}[]};

/** A successful final callback can hide an earlier receipt failure or a refunded NEP-141 deposit. */
export function confirmedHash(result:WalletOutcome|undefined,depositAmount?:string):string{
  if(!result)throw Error('The wallet returned no transaction result. Check your wallet before retrying.');
  const failed=(status:OutcomeStatus|string|undefined)=>typeof status==='object'&&status!==null&&'Failure' in status;
  if(failed(result.status)||result.receipts_outcome?.some(r=>failed(r.outcome.status)))throw Error('The transaction did not complete. Check its receipts in your wallet before retrying.');
  if(typeof result.status!=='object'||result.status===null||!('SuccessValue' in result.status))throw Error('The transaction is still pending. Check your wallet for its final result.');
  if(depositAmount!==undefined){
    let used:string;
    try{used=String(JSON.parse(atob(result.status.SuccessValue??'')));}catch{throw Error('The token returned no deposit receipt. Check your wallet before retrying.');}
    if(used!==depositAmount)throw Error('The vault did not accept the full deposit. Check the token refund in your wallet.');
  }
  if(!result.transaction?.hash)throw Error('The wallet returned no transaction hash. Check your wallet before retrying.');
  return result.transaction.hash;
}
