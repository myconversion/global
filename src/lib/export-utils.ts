import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportColumn {
  header: string;
  accessor: (row: any) => string;
}

export function exportToCSV(filename: string, columns: ExportColumn[], data: any[]) {
  const headers = columns.map(c => `"${c.header}"`).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = c.accessor(row);
      return `"${String(val ?? '').replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToPDF(
  filename: string,
  title: string,
  columns: ExportColumn[],
  data: any[],
  summary?: { label: string; value: string }[]
) {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Title
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Exportado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 25);

  let startY = 30;

  // Summary cards
  if (summary && summary.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(0);
    summary.forEach((s, i) => {
      const x = 14 + i * 65;
      doc.setFont(undefined as any, 'bold');
      doc.text(s.label, x, startY);
      doc.setFont(undefined as any, 'normal');
      doc.text(s.value, x, startY + 5);
    });
    startY += 14;
  }

  // Table
  const head = [columns.map(c => c.header)];
  const body = data.map(row => columns.map(c => c.accessor(row)));

  autoTable(doc, {
    startY,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
