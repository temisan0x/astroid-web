'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { QueryBoundary } from '@/components/dashboard/query-boundary';
import { EmptyState } from '@/components/ui/empty-state';
import { ChartIllustration } from '@/components/illustrations';
import { useTransactions } from '@/hooks/use-queries';
import { PageTransition } from '@/components/ui/motion';
import { XdrSignatureStatus } from '@/features/transactions/XdrSignatureStatus';
import { FeeOptimizationPanel } from '@/features/transactions/FeeOptimizationPanel';
import { TransactionAuditToolbar } from '@/features/transactions/TransactionAuditToolbar';
import { TransactionHistory } from '@/features/transactions/TransactionHistory';

export default function TransactionsPage() {
  const transactions = useTransactions();

  return (
    <PageTransition className="space-y-8">
      <PageHeader
        eyebrow="Operate"
        title="Transactions"
        description="Every value movement your agents have proposed, approved and settled on Stellar."
      />

      <XdrSignatureStatus />

      <QueryBoundary
        query={transactions}
        loading={<div className="skeleton h-96 w-full rounded-card" />}
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            illustration={<ChartIllustration />}
            title="No transactions yet"
            description="Once your agents start moving value, their on-chain activity lands here."
          />
        }
      >
        {(data) => (
          <div className="space-y-8">
            <FeeOptimizationPanel />

            <div className="space-y-4 pt-4 border-t border-border">
              <TransactionAuditToolbar
                totalRecordsCount={data.length}
                filteredRecordsCount={data.length}
                onExportCSV={() => {
                  const headers = ['ID', 'Counterparty', 'Purpose', 'Agent', 'Amount', 'Asset', 'Status'];
                  const rows = data.map((t) => [t.id, `"${t.counterparty}"`, `"${t.purpose}"`, `"${t.agentName || ''}"`, t.amount, t.asset, t.status]);
                  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `agent-transactions-${Date.now()}.csv`;
                  a.click();
                }}
              />
              <TransactionHistory transactions={data} />
            </div>
          </div>
        )}
      </QueryBoundary>
    </PageTransition>
  );
}
