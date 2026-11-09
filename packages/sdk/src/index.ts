export interface QuoteRequest {
  quote_id: string;
  defuse_asset_identifier_in: string;
  defuse_asset_identifier_out: string;
  exact_amount_in?: string;
  exact_amount_out?: string;
  min_deadline_ms: number;
}
export interface Constitution {
  allowed_pairs: string[];
  max_inventory_usdc: string;
  min_spread_bps: number;
  daily_loss_limit_usdc: string;
}
export function quoteConstantProduct(amountIn: bigint, reserveIn: bigint, reserveOut: bigint, spreadBps: number): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) throw Error('positive amount and reserves required');
  if (!Number.isInteger(spreadBps) || spreadBps < 0 || spreadBps >= 10_000) throw Error('invalid spread');
  const effective = amountIn * BigInt(10_000 - spreadBps);
  return effective * reserveOut / (reserveIn * 10_000n + effective);
}
export function quoteExactOut(amountOut: bigint, reserveIn: bigint, reserveOut: bigint, spreadBps: number): bigint {
  if (amountOut <= 0n || reserveIn <= 0n || reserveOut <= amountOut) throw Error('insufficient inventory');
  if (!Number.isInteger(spreadBps) || spreadBps < 0 || spreadBps >= 10_000) throw Error('invalid spread');
  const n = reserveIn * amountOut * 10_000n;
  const d = (reserveOut - amountOut) * BigInt(10_000 - spreadBps);
  return (n + d - 1n) / d;
}
export function evaluate(request: QuoteRequest, reserves: Record<string,string>, constitution: Constitution): { amount_in: string; amount_out: string } | { reason: string } {
  const pair = `${request.defuse_asset_identifier_in}/${request.defuse_asset_identifier_out}`;
  if (!constitution.allowed_pairs.includes(pair)) return {reason:'pair outside constitution'};
  const rin = BigInt(reserves[request.defuse_asset_identifier_in] || '0');
  const rout = BigInt(reserves[request.defuse_asset_identifier_out] || '0');
  if (!rin || !rout) return {reason:'Setup required: funded inventory on intents.near'};
  if ((request.exact_amount_in === undefined) === (request.exact_amount_out === undefined)) return {reason:'exactly one amount required'};
  const spread = constitution.min_spread_bps;
  try {
    const ain = request.exact_amount_in ? BigInt(request.exact_amount_in) : quoteExactOut(BigInt(request.exact_amount_out!),rin,rout,spread);
    const aout = request.exact_amount_out ? BigInt(request.exact_amount_out) : quoteConstantProduct(ain,rin,rout,spread);
    if (ain <= 0n || aout <= 0n || aout >= rout) return {reason:'insufficient output inventory'};
    if (aout > BigInt(constitution.max_inventory_usdc)) return {reason:'inventory cap exceeded'};
    return {amount_in:ain.toString(), amount_out:aout.toString()};
  } catch (error) { return {reason: error instanceof Error ? error.message : String(error)}; }
}
export const explorerUrl = (txHash: string, network: 'testnet'|'mainnet' = 'mainnet') => `https://${network === 'testnet' ? 'testnet.' : ''}nearblocks.io/txns/${encodeURIComponent(txHash)}`;
