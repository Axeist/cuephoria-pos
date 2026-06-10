import jsPDF from 'jspdf';
import { format } from 'date-fns';

export async function downloadAdminPayslip(
  payroll: Record<string, unknown>,
  toast: (opts: { title: string; description?: string; variant?: string }) => void,
) {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      const pageW = 210;
      const pageH = 297;
      const margin = 15;
      const contentW = pageW - margin * 2;
      const rightX = pageW - margin;

      // Avoid using ₹ in jsPDF default fonts (can render badly in some viewers)
      const money = (n: any) =>
        `Rs. ${(Number.isFinite(Number(n)) ? Number(n) : 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

      const periodLabel = format(new Date(payroll.year, payroll.month - 1, 1), 'MMMM yyyy');
      const generatedAtDate = payroll.generated_at ? new Date(payroll.generated_at) : new Date();
      const generatedLabel = format(generatedAtDate, 'MMM dd, yyyy');

      // As requested: payment method/date default to generation date
      const paymentStatus = (String(payroll.payment_status || '').trim().toUpperCase() || 'PENDING');
      const paymentMethod = 'UPI';
      const paymentDate = generatedLabel;

      const employeeId =
        String(
          payroll.staff_id ??
            payroll.employee_id ??
            payroll.user_id ??
            payroll.staff_uuid ??
            ''
        ) || '—';
      const payslipNo =
        String(payroll.payroll_id || payroll.id || '') ||
        `PAY-${String(payroll.year)}${String(payroll.month).padStart(2, '0')}-${employeeId === '—' ? 'XXXX' : employeeId.slice(-4)}`;

      const shortId = (v: string, head = 6, tail = 4) => {
        const s = String(v || '').trim();
        if (!s || s === '—') return '—';
        if (s.length <= head + tail + 1) return s;
        return `${s.slice(0, head)}…${s.slice(-tail)}`;
      };

      const netPayInWords = (amount: number) => {
        const toWords = (n: number) => {
          const ones = [
            '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
          ];
          const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
          const two = (x: number) => {
            if (x < 20) return ones[x];
            const t = Math.floor(x / 10);
            const o = x % 10;
            return `${tens[t]}${o ? ` ${ones[o]}` : ''}`.trim();
          };
          const three = (x: number) => {
            const h = Math.floor(x / 100);
            const r = x % 100;
            const head = h ? `${ones[h]} Hundred` : '';
            const tail = r ? two(r) : '';
            return `${head}${head && tail ? ' ' : ''}${tail}`.trim();
          };

          const crore = Math.floor(n / 10000000);
          const lakh = Math.floor((n % 10000000) / 100000);
          const thousand = Math.floor((n % 100000) / 1000);
          const rest = n % 1000;

          const parts: string[] = [];
          if (crore) parts.push(`${three(crore)} Crore`);
          if (lakh) parts.push(`${three(lakh)} Lakh`);
          if (thousand) parts.push(`${three(thousand)} Thousand`);
          if (rest) parts.push(three(rest));
          return parts.join(' ').trim() || 'Zero';
        };

        const safe = Number.isFinite(amount) ? amount : 0;
        const rupees = Math.floor(Math.abs(safe));
        const paise = Math.round((Math.abs(safe) - rupees) * 100);
        const rupeesWords = toWords(rupees);
        const paiseWords = paise ? toWords(paise) : '';
        const sign = safe < 0 ? 'Minus ' : '';
        const withPaise = paise ? ` and ${paiseWords} Paise` : '';
        return `${sign}${rupeesWords} Rupees${withPaise} Only`;
      };

      const ensureSpace = (y: number, needed: number) => {
        if (y + needed <= pageH - margin) return y;
        doc.addPage();
        return margin;
      };

      const drawPill = (x: number, y: number, w: number, h: number, fill: [number, number, number]) => {
        doc.setFillColor(fill[0], fill[1], fill[2]);
        doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
      };

      const ellipsize = (text: string, maxW: number) => {
        const s = String(text ?? '').trim() || '—';
        if (maxW <= 0) return s;
        if (doc.getTextWidth(s) <= maxW) return s;
        const ell = '…';
        if (doc.getTextWidth(ell) > maxW) return '';
        let lo = 0;
        let hi = s.length;
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          const candidate = `${s.slice(0, mid)}${ell}`;
          if (doc.getTextWidth(candidate) <= maxW) lo = mid + 1;
          else hi = mid;
        }
        const cut = Math.max(0, lo - 1);
        return `${s.slice(0, cut)}${ell}`;
      };

      const drawKeyValue = (
        x: number,
        y: number,
        key: string,
        value: string,
        maxW: number,
        keyColor: [number, number, number] = [140, 140, 140]
      ) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(keyColor[0], keyColor[1], keyColor[2]);
        doc.setFontSize(8);
        doc.text(ellipsize(key, maxW), x, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20);
        doc.setFontSize(10);
        doc.text(ellipsize(value || '—', maxW), x, y + 5);
      };

      const drawSectionHeader = (x: number, y: number, w: number, title: string, accent: [number, number, number]) => {
        doc.setFillColor(248, 248, 252);
        doc.roundedRect(x, y, w, 9, 2, 2, 'F');
        doc.setFillColor(accent[0], accent[1], accent[2]);
        doc.roundedRect(x, y, 4, 9, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(10);
        doc.text(title, x + 7, y + 6.2);
      };

      const drawTable = (x: number, y: number, w: number, rows: Array<{ label: string; value: number }>, accent: [number, number, number]) => {
        const labelX = x;
        const amountX = x + w;
        const rowH = 7;
        const headerY = y;

        doc.setDrawColor(230, 230, 235);
        doc.setLineWidth(0.2);
        doc.line(x, headerY + 10.5, x + w, headerY + 10.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 130);
        doc.setFontSize(8.5);
        doc.text('DESCRIPTION', labelX, headerY + 8.2);
        doc.text('AMOUNT', amountX, headerY + 8.2, { align: 'right' } as any);

        let yy = headerY + 16;
        rows.forEach((r, idx) => {
          yy = ensureSpace(yy, rowH + 2);
          if (idx % 2 === 1) {
            doc.setFillColor(252, 252, 255);
            doc.rect(x - 1.5, yy - 5.2, w + 3, 6.8, 'F');
          }
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(35, 35, 45);
          doc.setFontSize(9.5);
          doc.text(r.label, labelX, yy);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(accent[0], accent[1], accent[2]);
          doc.text(money(r.value), amountX, yy, { align: 'right' } as any);
          yy += rowH;
        });
        return yy;
      };

      const drawSignature = (x: number, y: number, w: number, h: number) => {
        // Simple “handwritten” stroke signature (deterministic)
        const pts: Array<[number, number]> = [
          [0.02, 0.65],
          [0.10, 0.30],
          [0.18, 0.70],
          [0.26, 0.40],
          [0.34, 0.75],
          [0.42, 0.32],
          [0.50, 0.62],
          [0.58, 0.35],
          [0.68, 0.70],
          [0.78, 0.45],
          [0.90, 0.60],
          [0.98, 0.38],
        ];
        doc.setDrawColor(35, 35, 45);
        doc.setLineWidth(0.6);
        let px = x + pts[0][0] * w;
        let py = y + pts[0][1] * h;
        for (let i = 1; i < pts.length; i++) {
          const nx = x + pts[i][0] * w;
          const ny = y + pts[i][1] * h;
          doc.line(px, py, nx, ny);
          px = nx;
          py = ny;
        }
      };

      // Header
      doc.setFillColor(20, 18, 28);
      doc.rect(0, 0, pageW, 34, 'F');
      doc.setFillColor(155, 135, 245);
      doc.rect(0, 0, pageW, 2.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('Cuephoria', margin, 18);
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 210);
      doc.text('PAYSLIP', margin, 26);

      drawPill(pageW - margin - 46, 12, 46, 10, [155, 135, 245]);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 18, 28);
      doc.setFontSize(9.5);
      doc.text(periodLabel, pageW - margin - 23, 18.7, { align: 'center' } as any);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 210);
      doc.setFontSize(8.5);
      doc.text(`Generated ${generatedLabel}`, rightX, 28, { align: 'right' } as any);

      // Info cards
      let y = 42;
      doc.setFillColor(255, 255, 255);
      const infoH = 44;
      doc.roundedRect(margin, y, contentW, infoH, 4, 4, 'F');
      doc.setDrawColor(235, 235, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, infoH, 4, 4, 'S');

      // 4-column grid with truncation to prevent overlaps
      const padX = 8;
      const colW4 = (contentW - padX * 2) / 4;
      const baseX = margin + padX;
      const maxW = colW4 - 6;

      const employeeIdDisplay = shortId(employeeId, 8, 4);
      const payslipNoDisplay = shortId(payslipNo, 10, 6);

      drawKeyValue(baseX + colW4 * 0, y + 10, 'EMPLOYEE', String(payroll.staff_name || '—'), maxW);
      drawKeyValue(baseX + colW4 * 1, y + 10, 'DESIGNATION', String(payroll.designation || '—'), maxW);
      drawKeyValue(baseX + colW4 * 2, y + 10, 'EMPLOYEE ID', employeeIdDisplay, maxW);
      drawKeyValue(baseX + colW4 * 3, y + 10, 'PAYSLIP NO', payslipNoDisplay, maxW);

      drawKeyValue(baseX + colW4 * 0, y + 27, 'PAY PERIOD', periodLabel, maxW);
      drawKeyValue(baseX + colW4 * 1, y + 27, 'PAYMENT STATUS', paymentStatus, maxW);
      drawKeyValue(baseX + colW4 * 2, y + 27, 'PAYMENT METHOD', paymentMethod, maxW);
      drawKeyValue(baseX + colW4 * 3, y + 27, 'PAYMENT DATE', paymentDate, maxW);

      y += infoH + 8;

      // Summary strip
      const gross = Number(payroll.gross_earnings) || 0;
      const allowances = Number(payroll.total_allowances) || 0;
      const deductions = Number(payroll.total_deductions) || 0;
      const net = Number(payroll.net_salary) || 0;

      // Attendance / prepared-by mini card (adds legitimacy)
      const hoursTracked = Number(payroll.total_working_hours) || 0;
      const preparedBy = String(user?.username || 'Admin');
      doc.setFillColor(255, 255, 255);
      const attH = 18;
      doc.roundedRect(margin, y, contentW, attH, 4, 4, 'F');
      doc.setDrawColor(235, 235, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, attH, 4, 4, 'S');

      drawKeyValue(baseX + colW4 * 0, y + 8, 'WORKING DAYS', `${Number(payroll.total_working_days) || 0}`, maxW);
      drawKeyValue(baseX + colW4 * 1, y + 8, 'HOURS TRACKED', hoursTracked ? `${hoursTracked.toFixed(1)} hrs` : '—', maxW);
      drawKeyValue(baseX + colW4 * 2, y + 8, 'ISSUED BY', 'Cuephoria Payroll', maxW);
      drawKeyValue(baseX + colW4 * 3, y + 8, 'PREPARED BY', preparedBy, maxW);
      y += attH + 8;

      doc.setFillColor(248, 248, 252);
      doc.roundedRect(margin, y, contentW, 18, 4, 4, 'F');
      doc.setDrawColor(235, 235, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, 18, 4, 4, 'S');

      const sY = y + 7.5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 130);
      doc.text('GROSS', margin + 8, sY);
      doc.text('ALLOWANCES', margin + 58, sY);
      doc.text('DEDUCTIONS', margin + 118, sY);
      doc.text('NET PAY', rightX - 28, sY);

      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 35);
      doc.text(money(gross), margin + 8, sY + 6.2);
      doc.setTextColor(16, 140, 80);
      doc.text(money(allowances), margin + 58, sY + 6.2);
      doc.setTextColor(220, 80, 70);
      doc.text(money(deductions), margin + 118, sY + 6.2);
      doc.setTextColor(155, 135, 245);
      doc.text(money(net), rightX, sY + 6.2, { align: 'right' } as any);

      y += 26;

      // Net pay in words (classic payslip element)
      y = ensureSpace(y, 16);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, y, contentW, 14, 4, 4, 'F');
      doc.setDrawColor(235, 235, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, 14, 4, 4, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 130);
      doc.setFontSize(8.5);
      doc.text('NET PAY (IN WORDS)', margin + 8, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(35, 35, 45);
      doc.setFontSize(9.5);
      doc.text(netPayInWords(net), margin + 8, y + 11.2, { maxWidth: contentW - 16 } as any);
      y += 20;

      // Two-column tables
      const gap = 10;
      const colW = (contentW - gap) / 2;
      const leftX = margin;
      const rightColX = margin + colW + gap;

      y = ensureSpace(y, 120);

      drawSectionHeader(leftX, y, colW, 'Earnings', [155, 135, 245]);
      drawSectionHeader(rightColX, y, colW, 'Deductions', [220, 80, 70]);

      const earningsRows: Array<{ label: string; value: number }> = [
        { label: `Base Salary (${Number(payroll.total_working_days) || 0} days)`, value: gross },
      ];
      const allowancesDetail = Array.isArray(payroll.allowances_detail) ? payroll.allowances_detail : [];
      allowancesDetail.forEach((a: any) => {
        const label = formatLabel(a?.type);
        const value = Number(a?.amount) || 0;
        if (value !== 0) earningsRows.push({ label, value });
      });

      const deductionsRows: Array<{ label: string; value: number }> = [];
      const deductionsDetail = Array.isArray(payroll.deductions_detail) ? payroll.deductions_detail : [];
      deductionsDetail.forEach((d: any) => {
        const label = formatLabel(d?.type);
        const value = Number(d?.amount) || 0;
        if (value !== 0) deductionsRows.push({ label, value });
      });
      if (deductionsRows.length === 0) deductionsRows.push({ label: 'No deductions', value: 0 });

      const leftEndY = drawTable(leftX, y, colW, earningsRows, [155, 135, 245]);
      const rightEndY = drawTable(rightColX, y, colW, deductionsRows, [220, 80, 70]);
      y = Math.max(leftEndY, rightEndY) + 6;

      // Totals + net pay highlight
      y = ensureSpace(y, 34);
      doc.setDrawColor(235, 235, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, 26, 4, 4, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 35);
      doc.setFontSize(10);
      doc.text('Total Earnings', margin + 10, y + 9);
      doc.text(money(gross + allowances), rightX - 60, y + 9, { align: 'right' } as any);

      doc.text('Total Deductions', margin + 10, y + 16);
      doc.setTextColor(220, 80, 70);
      doc.text(money(deductions), rightX - 60, y + 16, { align: 'right' } as any);

      drawPill(rightX - 52, y + 6.3, 52, 14, [155, 135, 245]);
      doc.setTextColor(20, 18, 28);
      doc.setFontSize(9);
      doc.text('NET PAY', rightX - 26, y + 11.3, { align: 'center' } as any);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.text(money(net), rightX - 26, y + 18.2, { align: 'center' } as any);

      // Footer + declaration / signatory
      const signY = ensureSpace(y + 34, 40);
      const gap2 = 10;
      const signBoxW = 78;
      const notesBoxW = contentW - signBoxW - gap2;
      const boxH = 30;

      // Notes box (left)
      doc.setDrawColor(235, 235, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, signY, notesBoxW, boxH, 4, 4, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 45, 55);
      doc.setFontSize(9);
      doc.text('Notes', margin + 8, signY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(95, 95, 105);
      doc.setFontSize(8);
      const notes = [
        'This payslip is generated from attendance and approved adjustments (allowances/deductions).',
        'If there is any discrepancy, please contact the administrator and regenerate payroll after corrections.',
        'This document is confidential and intended only for the employee and authorized personnel.',
      ];
      const noteX = margin + 8;
      const noteMaxW = notesBoxW - 16;
      let ny = signY + 13;
      notes.forEach((n) => {
        const lines = doc.splitTextToSize(`• ${n}`, noteMaxW) as string[];
        lines.forEach((ln) => {
          if (ny <= signY + boxH - 4) doc.text(ln, noteX, ny);
          ny += 4.2;
        });
      });

      // Authorized signatory box (right)
      const signX = margin + notesBoxW + gap2;
      doc.setDrawColor(235, 235, 240);
      doc.roundedRect(signX, signY, signBoxW, boxH, 4, 4, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 130);
      doc.setFontSize(8);
      doc.text('Authorized Signatory', signX + signBoxW / 2, signY + 8, { align: 'center' } as any);

      // Signature stroke + name
      drawSignature(signX + 8, signY + 10, signBoxW - 16, 10);
      doc.setDrawColor(210, 210, 220);
      doc.setLineWidth(0.2);
      doc.line(signX + 8, signY + 22.5, signX + signBoxW - 8, signY + 22.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 45, 55);
      doc.setFontSize(9);
      doc.text('Ranjith kumar S', signX + signBoxW / 2, signY + 27.2, { align: 'center' } as any);

      const footerY = pageH - 10;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140, 140, 150);
      doc.setFontSize(8);
      doc.text('Computer-generated payslip • No physical signature required', pageW / 2, footerY, { align: 'center' } as any);

      doc.save(`Payslip_${String(payroll.staff_name || 'Staff').replace(/\s+/g, '_')}_${format(new Date(payroll.year, payroll.month - 1), 'MMM_yyyy')}.pdf`);
      
      toast({
        title: 'Success',
        description: 'Payslip downloaded successfully'
      });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate payslip',
        variant: 'destructive'
      });
    }
  };
