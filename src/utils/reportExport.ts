/**
 * Utility functions for exporting agent financial reports (CSV / JSON).
 * All operations are client-side only — no server calls, mock-mode compatible.
 */

export interface ColumnDefinition<T = Record<string, any>> {
  key: keyof T & string;
  label: string;
}

export type ColumnSpec<T = Record<string, any>> =
  | (keyof T & string)
  | ColumnDefinition<T>;

/**
 * Filter dataset by date range (inclusive).
 * Supports ISO strings, YYYY-MM-DD strings, or Date instances.
 * `dateField` defaults to 'createdAt', falling back to 'updatedAt', 'timestamp', or 'resetsAt'.
 */
export function filterByDateRange<T extends Record<string, any>>(
  data: T[],
  start?: string | Date | null,
  end?: string | Date | null,
  dateField?: keyof T & string
): T[] {
  if (!data || !Array.isArray(data)) return [];

  const startMs = start ? new Date(start).getTime() : null;
  const endMs = end ? new Date(end).getTime() : null;

  // Handle YYYY-MM-DD start date -> 00:00:00.000Z
  let startTimestamp = startMs;
  if (typeof start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
    const d = new Date(`${start}T00:00:00.000Z`);
    startTimestamp = isNaN(d.getTime()) ? startMs : d.getTime();
  }

  // Handle YYYY-MM-DD end date -> 23:59:59.999Z
  let endTimestamp = endMs;
  if (typeof end === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
    const d = new Date(`${end}T23:59:59.999Z`);
    endTimestamp = isNaN(d.getTime()) ? endMs : d.getTime();
  }

  return data.filter((item) => {
    if (!item) return false;
    let fieldVal: any = undefined;

    if (dateField && item[dateField] !== undefined) {
      fieldVal = item[dateField];
    } else {
      fieldVal =
        item.createdAt ??
        item.updatedAt ??
        item.timestamp ??
        item.resetsAt ??
        item.lastTransactionAt;
    }

    if (fieldVal === undefined || fieldVal === null) return true;

    const itemMs = new Date(fieldVal).getTime();
    if (isNaN(itemMs)) return true;

    if (startTimestamp !== null && !isNaN(startTimestamp) && itemMs < startTimestamp) {
      return false;
    }
    if (endTimestamp !== null && !isNaN(endTimestamp) && itemMs > endTimestamp) {
      return false;
    }

    return true;
  });
}

/**
 * Converts array of data objects to CSV string formatted according to selected columns.
 */
export function toCSV<T extends Record<string, any>>(
  data: T[],
  selectedColumns: ColumnSpec<T>[]
): string {
  if (!selectedColumns || selectedColumns.length === 0) {
    return '';
  }

  const columns: ColumnDefinition<T>[] = selectedColumns.map((col) => {
    if (typeof col === 'string') {
      return { key: col, label: col };
    }
    return col;
  });

  // Header line
  const header = columns.map((col) => escapeCSVValue(col.label)).join(',');

  if (!data || data.length === 0) {
    return header;
  }

  // Data rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const val = item[col.key];
        return escapeCSVValue(formatValueForExport(val));
      })
      .join(',');
  });

  return [header, ...rows].join('\r\n');
}

/**
 * Converts array of data objects to JSON string formatted according to selected columns.
 */
export function toJSON<T extends Record<string, any>>(
  data: T[],
  selectedColumns?: ColumnSpec<T>[]
): string {
  if (!data) return '[]';

  let exportData: Record<string, any>[] = data;

  if (selectedColumns && selectedColumns.length > 0) {
    const columns: ColumnDefinition<T>[] = selectedColumns.map((col) => {
      if (typeof col === 'string') {
        return { key: col, label: col };
      }
      return col;
    });

    exportData = data.map((item) => {
      const filteredItem: Record<string, any> = {};
      columns.forEach((col) => {
        filteredItem[col.key] = item[col.key];
      });
      return filteredItem;
    });
  }

  return JSON.stringify(exportData, null, 2);
}

/**
 * Triggers client-side browser file download for given content string.
 */
export function triggerDownload(
  content: string,
  filename: string,
  mimeType: string = 'text/csv;charset=utf-8;'
): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/** Helper: Format cell value for export */
function formatValueForExport(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val instanceof Date) return val.toISOString();
    return JSON.stringify(val);
  }
  return String(val);
}

/** Helper: Escape string for CSV format */
function escapeCSVValue(val: string): string {
  if (
    val.includes('"') ||
    val.includes(',') ||
    val.includes('\n') ||
    val.includes('\r')
  ) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
