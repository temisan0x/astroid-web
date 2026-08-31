'use client';

import React, { useState, useMemo } from 'react';
import { useTransactions, useBudgets } from '@/hooks/use-queries';
import {
  filterByDateRange,
  toCSV,
  toJSON,
  triggerDownload,
  ColumnDefinition,
} from '@/utils/reportExport';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ChartIllustration } from '@/components/illustrations';
import {
  FileSpreadsheet,
  FileCode,
  Download,
  Calendar,
  CheckSquare,
  Square,
  RefreshCw,
  Filter,
  CheckCircle2,
  Table,
} from 'lucide-react';
import { toast } from 'sonner';

export type ReportDataSet = 'transactions' | 'budgets';
export type ExportFormat = 'csv' | 'json';

const TRANSACTION_COLUMNS: ColumnDefinition[] = [
  { key: 'id', label: 'Transaction ID' },
  { key: 'createdAt', label: 'Created Date' },
  { key: 'agentName', label: 'Agent Name' },
  { key: 'direction', label: 'Direction' },
  { key: 'counterparty', label: 'Counterparty' },
  { key: 'counterpartyAddress', label: 'Counterparty Address' },
  { key: 'amount', label: 'Amount' },
  { key: 'asset', label: 'Asset' },
  { key: 'usdValue', label: 'USD Value' },
  { key: 'status', label: 'Status' },
  { key: 'riskScore', label: 'Risk Score' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'memo', label: 'Memo' },
  { key: 'stellarHash', label: 'Stellar Hash' },
  { key: 'walletId', label: 'Wallet ID' },
  { key: 'agentId', label: 'Agent ID' },
  { key: 'organizationId', label: 'Organization ID' },
  { key: 'proposalId', label: 'Proposal ID' },
  { key: 'policyId', label: 'Policy ID' },
];

const DEFAULT_TRANSACTION_COLUMNS = [
  'id',
  'createdAt',
  'agentName',
  'direction',
  'counterparty',
  'amount',
  'asset',
  'usdValue',
  'status',
  'riskScore',
  'purpose',
];

const BUDGET_COLUMNS: ColumnDefinition[] = [
  { key: 'id', label: 'Budget ID' },
  { key: 'name', label: 'Budget Name' },
  { key: 'scope', label: 'Scope' },
  { key: 'limit', label: 'Limit' },
  { key: 'spent', label: 'Spent' },
  { key: 'remaining', label: 'Remaining' },
  { key: 'currency', label: 'Currency' },
  { key: 'period', label: 'Period' },
  { key: 'resetsAt', label: 'Resets At' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'organizationId', label: 'Organization ID' },
  { key: 'parentBudgetId', label: 'Parent Budget ID' },
];

const DEFAULT_BUDGET_COLUMNS = [
  'id',
  'name',
  'scope',
  'limit',
  'spent',
  'remaining',
  'currency',
  'period',
  'createdAt',
];

export interface FinancialReportExporterProps {
  initialDataSet?: ReportDataSet;
  className?: string;
}

export function FinancialReportExporter({
  initialDataSet = 'transactions',
  className = '',
}: FinancialReportExporterProps) {
  const transactionsQuery = useTransactions();
  const budgetsQuery = useBudgets();

  const [dataSet, setDataSet] = useState<ReportDataSet>(initialDataSet);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    initialDataSet === 'transactions' ? DEFAULT_TRANSACTION_COLUMNS : DEFAULT_BUDGET_COLUMNS
  );

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStage, setExportStage] = useState<string>('');

  // Switch columns default when dataSet changes
  const handleDataSetChange = (newDataSet: ReportDataSet) => {
    setDataSet(newDataSet);
    setSelectedColumns(
      newDataSet === 'transactions' ? DEFAULT_TRANSACTION_COLUMNS : DEFAULT_BUDGET_COLUMNS
    );
  };

  const availableColumns = dataSet === 'transactions' ? TRANSACTION_COLUMNS : BUDGET_COLUMNS;
  const isLoading = dataSet === 'transactions' ? transactionsQuery.isLoading : budgetsQuery.isLoading;

  // Filter records by date range
    const filteredData = useMemo(() => {
      const rawData = (dataSet === 'transactions' ? transactionsQuery.data ?? [] : budgetsQuery.data ?? []) as any[];
      return filterByDateRange(
        rawData,
        startDate || null,
        endDate || null,
        'createdAt'
      );
    }, [transactionsQuery.data, budgetsQuery.data, startDate, endDate, dataSet]);

  // Handle column selections
  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(availableColumns.map((c) => c.key));
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const handleResetDefaultColumns = () => {
    setSelectedColumns(
      dataSet === 'transactions' ? DEFAULT_TRANSACTION_COLUMNS : DEFAULT_BUDGET_COLUMNS
    );
  };

  // Date range presets
  const applyPreset = (preset: 'all' | 'last7' | 'last30' | 'thisMonth' | 'ytd') => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'last7') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'last30') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'ytd') {
      const firstJan = new Date(now.getFullYear(), 0, 1);
      setStartDate(firstJan.toISOString().slice(0, 10));
      setEndDate(todayStr);
    }
  };

  // Export trigger with progress simulation
  const handleExport = async () => {
    if (filteredData.length === 0) {
      toast.error('No records match your date range to export.');
      return;
    }
    if (selectedColumns.length === 0) {
      toast.error('Please select at least one column for the report.');
      return;
    }

    setIsExporting(true);
    setExportProgress(10);
    setExportStage('Filtering records by date criteria...');

    await new Promise((res) => setTimeout(res, 250));
    setExportProgress(40);
    setExportStage(`Compiling ${filteredData.length} records & ${selectedColumns.length} fields...`);

    await new Promise((res) => setTimeout(res, 350));
    setExportProgress(80);
    setExportStage(`Formatting output payload to ${format.toUpperCase()}...`);

    await new Promise((res) => setTimeout(res, 250));
    setExportProgress(100);
    setExportStage('Initiating browser download...');

    const activeCols = availableColumns.filter((col) => selectedColumns.includes(col.key));
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `astroid-financial-report-${dataSet}-${timestamp}.${format}`;

    if (format === 'csv') {
      const csvData = toCSV(filteredData, activeCols);
      triggerDownload(csvData, filename, 'text/csv;charset=utf-8;');
    } else {
      const jsonData = toJSON(filteredData, activeCols);
      triggerDownload(jsonData, filename, 'application/json');
    }

    toast.success(`Export successful! Downloaded ${filteredData.length} records to ${filename}`);

    await new Promise((res) => setTimeout(res, 300));
    setIsExporting(false);
    setExportProgress(0);
    setExportStage('');
  };

  return (
    <Card className={`overflow-hidden border border-border bg-surface ${className}`}>
      <CardHeader className="border-b border-border bg-surface/50 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                Financial Report Exporter
              </CardTitle>
              <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-2xs font-semibold text-gold border border-gold/20">
                Automated Export
              </span>
            </div>
            <CardDescription className="mt-1 text-xs text-foreground-secondary">
              Generate and download custom client-side financial activity reports for audits, bookkeeping, and analysis.
            </CardDescription>
          </div>

          {/* Dataset Toggle */}
          <div className="flex items-center rounded-button border border-border bg-surface-secondary p-1">
            <button
              type="button"
              onClick={() => handleDataSetChange('transactions')}
              className={`flex items-center gap-1.5 rounded-sm px-3 py-1 text-xs font-medium transition-all ${
                dataSet === 'transactions'
                  ? 'bg-surface text-foreground shadow-soft-1'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              Transactions ({transactionsQuery.data?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => handleDataSetChange('budgets')}
              className={`flex items-center gap-1.5 rounded-sm px-3 py-1 text-xs font-medium transition-all ${
                dataSet === 'budgets'
                  ? 'bg-surface text-foreground shadow-soft-1'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Budgets ({budgetsQuery.data?.length ?? 0})
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* Section 1: Date Range Picker & Presets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Calendar className="h-4 w-4 text-gold" />
              Date Range Filter
            </label>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className={`rounded px-2 py-0.5 text-2xs font-medium transition-colors ${
                  !startDate && !endDate
                    ? 'bg-gold/20 text-gold-strong border border-gold/30'
                    : 'text-foreground-secondary hover:bg-surface-secondary hover:text-foreground'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => applyPreset('last7')}
                className="rounded px-2 py-0.5 text-2xs font-medium text-foreground-secondary hover:bg-surface-secondary hover:text-foreground"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset('last30')}
                className="rounded px-2 py-0.5 text-2xs font-medium text-foreground-secondary hover:bg-surface-secondary hover:text-foreground"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset('thisMonth')}
                className="rounded px-2 py-0.5 text-2xs font-medium text-foreground-secondary hover:bg-surface-secondary hover:text-foreground"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ytd')}
                className="rounded px-2 py-0.5 text-2xs font-medium text-foreground-secondary hover:bg-surface-secondary hover:text-foreground"
              >
                YTD
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-2xs font-medium text-foreground-secondary">Start Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-button border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-gold focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <span className="text-2xs font-medium text-foreground-secondary">End Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-button border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-gold focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Format Selection */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-semibold text-foreground">Export Format</label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`flex items-center justify-center gap-2 rounded-card border p-3 text-xs font-medium transition-all ${
                format === 'csv'
                  ? 'border-gold bg-gold/10 text-foreground ring-1 ring-gold/40'
                  : 'border-border bg-surface text-foreground-secondary hover:border-border-strong hover:text-foreground'
              }`}
            >
              <FileSpreadsheet className={`h-4 w-4 ${format === 'csv' ? 'text-gold' : 'text-foreground-muted'}`} />
              <span>CSV Spreadsheet (.csv)</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`flex items-center justify-center gap-2 rounded-card border p-3 text-xs font-medium transition-all ${
                format === 'json'
                  ? 'border-gold bg-gold/10 text-foreground ring-1 ring-gold/40'
                  : 'border-border bg-surface text-foreground-secondary hover:border-border-strong hover:text-foreground'
              }`}
            >
              <FileCode className={`h-4 w-4 ${format === 'json' ? 'text-gold' : 'text-foreground-muted'}`} />
              <span>JSON Payload (.json)</span>
            </button>
          </div>
        </div>

        {/* Section 3: Column / Field Checkboxes */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <CheckSquare className="h-4 w-4 text-gold" />
              Column & Field Selection ({selectedColumns.length} of {availableColumns.length} selected)
            </label>
            <div className="flex items-center gap-3 text-2xs">
              <button
                type="button"
                onClick={handleSelectAllColumns}
                className="font-medium text-gold hover:underline"
              >
                Select All
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={handleDeselectAllColumns}
                className="font-medium text-foreground-secondary hover:underline"
              >
                Deselect All
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={handleResetDefaultColumns}
                className="font-medium text-foreground-secondary hover:underline"
              >
                Reset Defaults
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-card border border-border bg-surface-secondary/40 p-4 sm:grid-cols-3 md:grid-cols-4">
            {availableColumns.map((col) => {
              const isChecked = selectedColumns.includes(col.key);
              return (
                <label
                  key={col.key}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-button border p-2 text-xs transition-colors ${
                    isChecked
                      ? 'border-gold/30 bg-gold/5 font-medium text-foreground'
                      : 'border-transparent text-foreground-secondary hover:bg-surface-secondary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleColumn(col.key)}
                    className="sr-only"
                  />
                  {isChecked ? (
                    <CheckSquare className="h-4 w-4 shrink-0 text-gold" />
                  ) : (
                    <Square className="h-4 w-4 shrink-0 text-foreground-muted" />
                  )}
                  <span className="truncate">{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Section 4: Empty State or Matching Records Summary */}
        <div className="pt-2">
          {isLoading ? (
            <div className="skeleton h-20 w-full rounded-card" />
          ) : filteredData.length === 0 ? (
            <EmptyState
              compact
              illustration={<ChartIllustration />}
              title="No matching records found"
              description={`No ${dataSet} match your selected date range (${startDate || 'Start'} to ${endDate || 'End'}). Adjust dates or select 'All Time' to compile a report.`}
            />
          ) : (
            <div className="flex items-center justify-between rounded-card border border-border bg-surface-secondary/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Ready to Compile Report
                  </p>
                  <p className="text-2xs text-foreground-secondary">
                    {filteredData.length} {dataSet} record{filteredData.length === 1 ? '' : 's'} matching criteria across {selectedColumns.length} selected field{selectedColumns.length === 1 ? '' : 's'}.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-surface px-3 py-1 font-mono text-xs font-medium text-gold border border-border">
                ~{format === 'csv' ? (filteredData.length * 0.2).toFixed(1) : (filteredData.length * 0.4).toFixed(1)} KB
              </span>
            </div>
          )}
        </div>

        {/* Progress bar during compilation */}
        {isExporting && (
          <div className="space-y-2 rounded-card border border-gold/30 bg-gold/5 p-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-gold" />
                {exportStage}
              </span>
              <span className="font-mono text-xs font-semibold text-gold">{exportProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full bg-gold transition-all duration-300 ease-out"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border bg-surface/50 p-6">
        <div className="text-2xs text-foreground-muted">
          Client-side serialization — zero network transmit, fully private & local.
        </div>
        <Button
          variant="gold"
          size="md"
          loading={isExporting}
          disabled={filteredData.length === 0 || selectedColumns.length === 0 || isExporting}
          onClick={handleExport}
          leftIcon={<Download className="h-4 w-4" />}
        >
          {isExporting ? 'Compiling Report...' : `Export Report (${format.toUpperCase()})`}
        </Button>
      </CardFooter>
    </Card>
  );
}
