export type Receipt={receipt:{receiver_id:string;block_timestamp:number;receipt_id:string};execution_outcome:{id?:string;outcome:{logs:string[];status:unknown}}};
export type FullTx={transaction:{hash:string;signer_id:string;receiver_id:string;actions:({FunctionCall?:{method_name:string;args:string}}|string)[]};receipts:Receipt[]};

/** The index can return overlapping snapshots while a transaction is being indexed. */
export function uniqueReceipts(txs:FullTx[]):{tx:FullTx;receipt:Receipt}[]{
  const receipts=new Map<string,{tx:FullTx;receipt:Receipt}>();
  for(const tx of txs)for(const receipt of tx.receipts){
    const id=receipt.receipt.receipt_id||receipt.execution_outcome.id;
    if(!id)throw Error('The testnet transaction index returned a receipt without an ID. Please retry.');
    const key=`${tx.transaction.hash}:${id}`,previous=receipts.get(key);
    if(!previous||receipt.execution_outcome.outcome.logs.length>=previous.receipt.execution_outcome.outcome.logs.length)receipts.set(key,{tx,receipt});
  }
  return [...receipts.values()].filter(({receipt})=>{
    const status=receipt.execution_outcome.outcome.status;
    return !(typeof status==='object'&&status!==null&&'Failure' in status);
  });
}
