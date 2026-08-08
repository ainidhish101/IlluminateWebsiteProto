/*
  Volunteer-hours certificate.

  Generated client-side with jsPDF, matching the layout language of the GPA
  tool's transcript export (same brand colors, same margins) so the two
  documents look like they came from the same organization.

  Only hours already granted by a Director appear here — this renders the
  database, it does not vouch for anything on its own.
*/

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { VolunteerHourRow } from "~/lib/db";

// Copied from app.css's light-mode tokens; jsPDF can't read CSS variables.
const NAVY: [number, number, number] = [21, 24, 46];
const BLUE: [number, number, number] = [43, 68, 171];
const GRAY: [number, number, number] = [110, 115, 130];

export function downloadHoursCertificate(opts: {
  studentName: string;
  studentEmail: string;
  rows: VolunteerHourRow[];
  total: number;
}) {
  const { studentName, studentEmail, rows, total } = opts;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text("Illuminate", margin, 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text("Free K–12 academic guidance, student-run", margin, 72);

  doc.setDrawColor(...BLUE);
  doc.setLineWidth(1.5);
  doc.line(margin, 84, pageWidth - margin, 84);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text("Certificate of Volunteer Service", margin, 116);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(studentName, margin, 142);
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(studentEmail, margin, 157);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...BLUE);
  doc.text(`${total.toLocaleString()} hours`, pageWidth - margin, 142, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text("total awarded", pageWidth - margin, 157, { align: "right" });

  autoTable(doc, {
    startY: 184,
    margin: { left: margin, right: margin },
    head: [["Date", "Contribution", "Hours"]],
    body: rows.map((row) => [row.date, row.reason, Number(row.hours).toFixed(1)]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 246, 250] },
    columnStyles: { 2: { halign: "right", cellWidth: 60 } },
  });

  const endY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 400;

  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    `Issued ${new Date().toLocaleDateString()}. Every hour above was reviewed and awarded by an Illuminate Director.`,
    margin,
    endY + 28,
    { maxWidth: pageWidth - margin * 2 },
  );

  const slug = studentName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "volunteer";
  doc.save(`illuminate-hours-${slug}.pdf`);
}
