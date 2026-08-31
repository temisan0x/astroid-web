import { Transaction } from '@/types/domain';

const AGENTS = [
  { id: 'agent_1', name: 'Payments Bot' },
  { id: 'agent_2', name: 'Payroll Agent' },
  { id: 'agent_3', name: 'Treasury' },
];

const STATUSES: Transaction['status'][] = ['pending', 'completed', 'failed'];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockTransactions(count = 20): Transaction[] {
  const now = Date.now();

  return Array.from({ length: count }).map((_, i) => {
    const agent = Math.random() < 0.7 ? pick(AGENTS) : undefined;
    const direction = Math.random() < 0.5 ? 'outbound' : 'inbound';
    const amount = Number((Math.random() * 2000 + 1).toFixed(2));
    const asset = Math.random() < 0.85 ? 'XLM' : 'USDC';
    const status = pick(STATUSES) as Transaction['status'];

    const tx: Transaction = {
      id: `tx_${i}_${Date.now().toString(36)}`,
      organizationId: 'org_1',
      walletId: 'wallet_1',
      agentId: agent?.id,
      agentName: agent?.name,
      direction,
      counterparty: Math.random() < 0.5 ? 'Acme Corp' : 'Random User',
      counterpartyAddress: `G${Math.random().toString(36).slice(2, 16).toUpperCase()}`,
      asset,
      amount,
      usdValue: Number((amount * (asset === 'USDC' ? 1 : 0.1)).toFixed(2)),
      memo: Math.random() < 0.3 ? 'Invoice payment' : undefined,
      purpose: Math.random() < 0.5 ? 'Subscription' : 'Payout',
      status,
      riskScore: randomInt(0, 100),
      stellarHash: Math.random() < 0.6 ? Math.random().toString(36).slice(2, 18) : undefined,
      createdAt: new Date(now - i * 1000 * 60 * randomInt(10, 500)).toISOString(),
    };

    return tx;
  });
}

export const mockTransactions = generateMockTransactions(40);
