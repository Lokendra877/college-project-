import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SessionAnalytics } from '@/hooks/useSessionAnalytics';

interface SessionInfo {
  id: string;
  title: string;
  created_at: string;
  speaking_time_seconds: number;
  is_active: boolean;
}

interface Recording {
  id: string;
  speaker_name: string;
  file_path: string;
  duration_seconds: number;
  recorded_at: string;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── CSV Export ──

function arrayToCSV(headers: string[], rows: string[][]): string {
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')];
  rows.forEach(row => lines.push(row.map(escape).join(',')));
  return lines.join('\n');
}

export function exportSpeakerQueueCSV(analytics: SessionAnalytics, session: SessionInfo) {
  const headers = ['#', 'Name', 'Status', 'Started At', 'Finished At', 'Duration (s)'];
  const rows = analytics.speakerLog.map((entry, i) => {
    const duration = entry.started_speaking_at && entry.finished_speaking_at
      ? Math.round((new Date(entry.finished_speaking_at).getTime() - new Date(entry.started_speaking_at).getTime()) / 1000)
      : 0;
    return [
      String(i + 1),
      entry.user_name,
      entry.status,
      entry.started_speaking_at ? new Date(entry.started_speaking_at).toLocaleString() : '-',
      entry.finished_speaking_at ? new Date(entry.finished_speaking_at).toLocaleString() : '-',
      String(duration),
    ];
  });

  const csv = arrayToCSV(headers, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${session.title}_speakers.csv`);
}

export function exportAnalyticsCSV(analytics: SessionAnalytics, session: SessionInfo) {
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Session Title', session.title],
    ['Created At', new Date(session.created_at).toLocaleString()],
    ['Status', session.is_active ? 'Active' : 'Ended'],
    ['Speaking Time Limit', `${session.speaking_time_seconds}s`],
    ['Total Speakers', String(analytics.totalSpeakers)],
    ['Completed', String(analytics.completedSpeakers)],
    ['Skipped', String(analytics.skippedSpeakers)],
    ['Waiting', String(analytics.waitingSpeakers)],
    ['Avg Speaking Time', formatDuration(analytics.averageSpeakingTime)],
    ['Total Speaking Time', formatDuration(analytics.totalSpeakingTime)],
    ['Session Duration', formatDuration(analytics.sessionDuration)],
  ];

  const csv = arrayToCSV(headers, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${session.title}_analytics.csv`);
}

export function exportRecordingsCSV(recordings: Recording[], session: SessionInfo) {
  const headers = ['Speaker', 'Duration (s)', 'Recorded At', 'File Path'];
  const rows = recordings.map(r => [
    r.speaker_name,
    String(r.duration_seconds ?? 0),
    new Date(r.recorded_at).toLocaleString(),
    r.file_path,
  ]);

  const csv = arrayToCSV(headers, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${session.title}_recordings.csv`);
}

export function exportAllCSV(analytics: SessionAnalytics, recordings: Recording[], session: SessionInfo) {
  // Combined CSV with sections
  let content = '=== SESSION INFO ===\n';
  content += `Title,${session.title}\n`;
  content += `Created,${new Date(session.created_at).toLocaleString()}\n`;
  content += `Status,${session.is_active ? 'Active' : 'Ended'}\n`;
  content += `Time Limit,${session.speaking_time_seconds}s\n\n`;

  content += '=== ANALYTICS ===\n';
  content += `Total Speakers,${analytics.totalSpeakers}\n`;
  content += `Completed,${analytics.completedSpeakers}\n`;
  content += `Skipped,${analytics.skippedSpeakers}\n`;
  content += `Waiting,${analytics.waitingSpeakers}\n`;
  content += `Avg Speaking Time,${formatDuration(analytics.averageSpeakingTime)}\n`;
  content += `Total Speaking Time,${formatDuration(analytics.totalSpeakingTime)}\n`;
  content += `Session Duration,${formatDuration(analytics.sessionDuration)}\n\n`;

  content += '=== SPEAKER QUEUE ===\n';
  content += '#,Name,Status,Started At,Finished At,Duration (s)\n';
  analytics.speakerLog.forEach((entry, i) => {
    const duration = entry.started_speaking_at && entry.finished_speaking_at
      ? Math.round((new Date(entry.finished_speaking_at).getTime() - new Date(entry.started_speaking_at).getTime()) / 1000)
      : 0;
    content += `${i + 1},${entry.user_name},${entry.status},${entry.started_speaking_at ? new Date(entry.started_speaking_at).toLocaleString() : '-'},${entry.finished_speaking_at ? new Date(entry.finished_speaking_at).toLocaleString() : '-'},${duration}\n`;
  });

  if (recordings.length > 0) {
    content += '\n=== RECORDINGS ===\n';
    content += 'Speaker,Duration (s),Recorded At\n';
    recordings.forEach(r => {
      content += `${r.speaker_name},${r.duration_seconds ?? 0},${new Date(r.recorded_at).toLocaleString()}\n`;
    });
  }

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${session.title}_full_report.csv`);
}

// ── PDF Export ──

export function exportSessionPDF(analytics: SessionAnalytics, recordings: Recording[], session: SessionInfo) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(session.title, pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(`Session Report · ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 12;

  // Session Info
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Session Info', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Created', new Date(session.created_at).toLocaleString()],
      ['Status', session.is_active ? 'Active' : 'Ended'],
      ['Time Limit per Speaker', `${session.speaking_time_seconds}s`],
      ['Total Speakers', String(analytics.totalSpeakers)],
      ['Completed', String(analytics.completedSpeakers)],
      ['Skipped', String(analytics.skippedSpeakers)],
      ['Waiting', String(analytics.waitingSpeakers)],
      ['Avg Speaking Time', formatDuration(analytics.averageSpeakingTime)],
      ['Total Speaking Time', formatDuration(analytics.totalSpeakingTime)],
      ['Session Duration', formatDuration(analytics.sessionDuration)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Speaker Queue
  if (analytics.speakerLog.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Speaker Queue', 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Name', 'Status', 'Started', 'Finished', 'Duration']],
      body: analytics.speakerLog.map((entry, i) => {
        const duration = entry.started_speaking_at && entry.finished_speaking_at
          ? Math.round((new Date(entry.finished_speaking_at).getTime() - new Date(entry.started_speaking_at).getTime()) / 1000)
          : 0;
        return [
          String(i + 1),
          entry.user_name,
          entry.status,
          entry.started_speaking_at ? new Date(entry.started_speaking_at).toLocaleTimeString() : '-',
          entry.finished_speaking_at ? new Date(entry.finished_speaking_at).toLocaleTimeString() : '-',
          duration > 0 ? `${duration}s` : '-',
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Recordings
  if (recordings.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Audio Recordings', 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Speaker', 'Duration', 'Recorded At']],
      body: recordings.map(r => [
        r.speaker_name,
        r.duration_seconds ? formatDuration(r.duration_seconds) : '-',
        new Date(r.recorded_at).toLocaleString(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: 14, right: 14 },
    });
  }

  doc.save(`${session.title}_report.pdf`);
}
