
interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export async function connectWallet(): Promise<string> {
  const eth = (globalThis as { ethereum?: Eip1193 }).ethereum;
  if (!eth) throw new Error('No injected wallet found');
  const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts[0]) throw new Error('No account returned');
  return accounts[0];
}