'use client';

import React, { useMemo, useState } from 'react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { Transaction } from '@/types/domain';
import { formatCurrency, formatRelativeTime, truncateHash } from '@/lib/format';

interface TransactionHistoryTableProps {
  transactions: Transaction[];
  className?: string;
}

type StatusFilter = 'all' | 'completed' | 'pending' | 'failed';

export function TransactionHistoryTable({ transactions, className }: TransactionHistoryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const agents = useMemo(() => {
    const unique = Array.from(new Set(transactions.map((t) => t.agentName).filter(Boolean)));
    return ['all', ...unique];
  }, [transactions]);

  const columns = useMemo<ColumnDef<Transaction, unknown>[]>(
    () => [
      {
        accessorKey: 'counterparty',
        header: 'Counterparty',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.original.counterparty}</p>
            <p className="tabular text-2xs text-foreground-muted">{truncateHash(row.original.counterpartyAddress)}</p>
          </div>
        ),
      },
      {
        accessorKey: 'agentName',
        header: 'Agent',
        cell: ({ row }) => <span className="text-foreground-secondary">{row.original.agentName ?? '—'}</span>,
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => {
          const tx = row.original;
          const outbound = tx.direction === 'outbound';
          return (
            <span className={`inline-flex items-center justify-end gap-1 font-medium tabular ${outbound ? 'text-foreground' : 'text-success'}`}>
              {outbound ? '−' : '+'}
              {formatCurrency(tx.amount, tx.asset)}
            </span>
          );
        },
        meta: { className: 'text-right' },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge size="sm">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'createdAt',
        header: 'When',
        cell: ({ row }) => <span className="text-2xs text-foreground-muted">{formatRelativeTime(row.original.createdAt)}</span>,
        meta: { className: 'text-right' },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = (filterValue ?? '').toString().trim().toLowerCase();
      if (!search) return true;

      const candidates = [row.original, row.getVisibleCells().map((cell) => cell.getValue())]
        .flat()
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      return candidates.some((v) => v.includes(search));
    },
    filterFns: {},
  });

  // Apply UI-level filters (agent + status) on top of table's filtered rows
  const filteredRows = useMemo(() => {
    const rows = table.getFilteredRowModel().rows;

    return rows.filter((r) => {
      const tx = r.original;

      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (agentFilter !== 'all' && (tx.agentName ?? '—') !== agentFilter) return false;

      return true;
    });
  }, [table, statusFilter, agentFilter]);

  function exportCSV() {
    const headers = columns.map((c) => (typeof c.header === 'string' ? c.header : ''));
    const rows = filteredRows.map((r) =>
      columns.map((c) => {
        const key = (c as unknown as { accessorKey?: string }).accessorKey;
        return String(key ? r.getValue(key) : '');
      }),
    );
    const csv = [headers.join(','), ...rows.map((r) => r.map((cell) => JSON.stringify(cell)).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const data = filteredRows.map((r) => r.original);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={cn('overflow-hidden rounded-card border border-border bg-surface', className)}>
      <div className="flex flex-col gap-3 border-b border-border bg-surface-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-2xs text-foreground-secondary">Agent</span>
            <select
              aria-label="Filter by agent"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface py-2 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {agents.map((a) => (
                <option key={a} value={a}>
                  {a === 'all' ? 'All agents' : a}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-2xs text-foreground-secondary">Status</span>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-9 rounded-md border border-border bg-surface py-2 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative block sm:mr-2">
            <input
              aria-label="Search transactions"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search counterparty, purpose, or asset"
              className="h-9 w-full min-w-[220px] rounded-md border border-border bg-surface py-2 px-3 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <Button type="button" variant="secondary" size="sm" onClick={exportCSV} leftIcon={<FileText className="h-4 w-4" />}>
            CSV
          </Button>

          <Button type="button" variant="secondary" size="sm" onClick={exportJSON} leftIcon={<Download className="h-4 w-4" />}>
            JSON
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border bg-surface-secondary/40">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={cn('px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-foreground-secondary',
                        canSort && 'cursor-pointer select-none')}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          className={cn('inline-flex items-center gap-1.5 text-left font-medium transition-colors hover:text-foreground', !canSort && 'cursor-default')}
                        >
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          {canSort && (
                            <span className="text-foreground-muted">
                              {header.column.getIsSorted() === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : header.column.getIsSorted() === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5 opacity-50" />}
                            </span>
                          )}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-border">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  <div className="rounded-card border border-dashed border-border bg-surface p-8 text-center text-sm text-foreground-secondary">
                    No transactions match the current filters.
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.slice(pagination.pageIndex * pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize).map((row) => (
                <tr
                  key={row.id}
                  role="row"
                  tabIndex={0}
                  className="transition-colors duration-fast hover:bg-surface-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={cn('px-4 py-3 align-middle text-foreground', (cell.column.columnDef.meta as { className?: string } | undefined)?.className)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-surface-secondary/20 px-4 py-3 text-xs text-foreground-secondary sm:flex-row sm:items-center sm:justify-between">
        <p className="tabular-nums">
          {filteredRows.length === 0 ? '0 rows' : `${pagination.pageIndex * pagination.pageSize + 1}-${Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredRows.length)} of ${filteredRows.length}`}
        </p>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.max(p.pageIndex - 1, 0) }))}>
            Prev
          </Button>
          <span className="tabular-nums">{pagination.pageIndex + 1} / {Math.max(1, Math.ceil(filteredRows.length / pagination.pageSize))}</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.min(p.pageIndex + 1, Math.max(0, Math.ceil(filteredRows.length / pagination.pageSize) - 1)) }))}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TransactionHistoryTable;
