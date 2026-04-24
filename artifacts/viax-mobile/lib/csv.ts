import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export type CsvCell = string | number | null | undefined;

const escapeCell = (v: CsvCell): string => {
  const s = v == null ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
};

export function buildCsv(header: string[], rows: CsvCell[][]): string {
  const csvRows = [header, ...rows].map((row) => row.map(escapeCell).join(','));
  return '\uFEFF' + csvRows.join('\n');
}

/**
 * Writes a CSV string to a temp file and opens the system share sheet.
 * Falls back to FileSystem.cacheDirectory when documentDirectory is unavailable.
 */
export async function shareCsv(filename: string, csv: string): Promise<void> {
  const safeName = filename.replace(/[^\w.\-]+/g, '_').replace(/\.csv$/i, '') + '.csv';
  const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!dir) {
    throw new Error('Sistema de arquivos indisponível neste dispositivo.');
  }
  const path = dir + safeName;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Compartilhamento não disponível neste dispositivo.');
  }
  await Sharing.shareAsync(path, {
    mimeType: 'text/csv',
    dialogTitle: 'Compartilhar CSV',
    UTI: 'public.comma-separated-values-text',
  });
}
