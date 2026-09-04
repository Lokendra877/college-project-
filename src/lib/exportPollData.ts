import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PollInfo {
  id: string;
  question: string;
  options: string[];
  is_multi_select: boolean;
  is_active: boolean;
  created_at: string;
}

interface VoteDetail {
  device_id: string;
  option_index: number;
  user_name?: string;
  user_email?: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitize(str: string): string {
  return `"${(str || '').replace(/"/g, '""')}"`;
}

export function exportPollResultsCSV(
  poll: PollInfo,
  votes: VoteDetail[],
  votersByOption: Record<number, VoteDetail[]>
) {
  const totalVotes = votes.length;
  const uniqueVoters = new Set(votes.map(v => v.device_id)).size;

  let csv = `Poll Question,${sanitize(poll.question)}\n`;
  csv += `Type,${poll.is_multi_select ? 'Multi-select' : 'Single-select'}\n`;
  csv += `Status,${poll.is_active ? 'Active' : 'Closed'}\n`;
  csv += `Total Votes,${totalVotes}\n`;
  csv += `Unique Voters,${uniqueVoters}\n`;
  csv += `Created,${new Date(poll.created_at).toLocaleString()}\n\n`;

  // Results summary
  csv += 'Option,Votes,Percentage\n';
  poll.options.forEach((option, idx) => {
    const count = (votersByOption[idx] || []).length;
    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    csv += `${sanitize(option)},${count},${pct}%\n`;
  });

  csv += '\n';

  // Voter details
  csv += 'Option,Voter Name,Voter Email,Device ID\n';
  poll.options.forEach((option, idx) => {
    const voters = votersByOption[idx] || [];
    voters.forEach(v => {
      csv += `${sanitize(option)},${sanitize(v.user_name || 'Anonymous')},${sanitize(v.user_email || '-')},${sanitize(v.device_id)}\n`;
    });
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const safeName = poll.question.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  downloadBlob(blob, `poll_${safeName}.csv`);
}

export function exportPollResultsPDF(
  poll: PollInfo,
  votes: VoteDetail[],
  votersByOption: Record<number, VoteDetail[]>,
  optionCounts: Record<number, number>
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalVotes = votes.length;
  const uniqueVoters = new Set(votes.map(v => v.device_id)).size;
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Poll Results', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 12;

  // Poll info
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Poll Details', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Field', 'Value']],
    body: [
      ['Question', poll.question],
      ['Type', poll.is_multi_select ? 'Multi-select' : 'Single-select'],
      ['Status', poll.is_active ? 'Active' : 'Closed'],
      ['Total Votes', String(totalVotes)],
      ['Unique Voters', String(uniqueVoters)],
      ['Created', new Date(poll.created_at).toLocaleString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Results table
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Results', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Option', 'Votes', '%']],
    body: poll.options.map((option, idx) => {
      const count = optionCounts[idx] || 0;
      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return [option, String(count), `${pct}%`];
    }),
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Voter details
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Voter Details', 14, y);
  y += 6;

  const voterRows: string[][] = [];
  poll.options.forEach((option, idx) => {
    const voters = votersByOption[idx] || [];
    voters.forEach(v => {
      voterRows.push([
        option,
        v.user_name || 'Anonymous',
        v.user_email || '-',
      ]);
    });
  });

  if (voterRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Option', 'Name', 'Email']],
      body: voterRows,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No voter details available.', 14, y);
  }

  const safeName = poll.question.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  doc.save(`poll_${safeName}.pdf`);
}