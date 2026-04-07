/**
 * Invoice PDF Generator with GST support
 */

import { Invoice } from "@/types/accounting";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import { classifyB2BorB2C } from "@/lib/gst";

export function generateInvoicePDF(invoice: Invoice, orgName: string, currency: CurrencyCode) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const classification = classifyB2BorB2C(invoice.customerGstin);

  const lineItemRows = invoice.lineItems
    .map(
      (li) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${li.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;color:#6b7280">${li.hsnCode || "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${li.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${formatCurrency(li.price, currency)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${formatCurrency(li.total, currency)}</td>
      </tr>`
    )
    .join("");

  const taxRows = invoice.isInterstate
    ? `<div class="tax-row"><span>IGST (${invoice.taxRate}%)</span><span>${formatCurrency(invoice.igstAmount || 0, currency)}</span></div>`
    : `<div class="tax-row"><span>CGST (${invoice.taxRate / 2}%)</span><span>${formatCurrency(invoice.cgstAmount || 0, currency)}</span></div>
       <div class="tax-row"><span>SGST (${invoice.taxRate / 2}%)</span><span>${formatCurrency(invoice.sgstAmount || 0, currency)}</span></div>`;

  const gstinRow = invoice.customerGstin
    ? `<div class="info-row"><div class="info-label">GSTIN</div><div class="info-value" style="font-family:monospace;background:#f3f4f6;padding:2px 8px;border-radius:4px">${invoice.customerGstin}</div></div>`
    : '';

  const posRow = invoice.placeOfSupply
    ? `<div class="info-row"><div class="info-label">Place of Supply</div><div class="info-value">${invoice.placeOfSupply} <span style="color:#6b7280;font-size:12px">(${invoice.isInterstate ? 'Inter-state' : 'Intra-state'})</span></div></div>`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${invoice.invoiceNumber}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1a1a1a; padding:40px; max-width:800px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:20px; border-bottom:2px solid #e5e7eb; }
    .company { font-size:24px; font-weight:700; }
    .invoice-meta { text-align:right; }
    .invoice-number { font-size:20px; font-weight:600; color:#6366f1; }
    .meta-row { font-size:13px; color:#6b7280; margin-top:4px; }
    .info-section { margin-bottom:24px; display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .info-row { margin-bottom:8px; }
    .info-label { font-size:11px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px; }
    .info-value { font-size:14px; font-weight:500; }
    .classification { display:inline-block; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
    .classification-b2b { background:#dbeafe; color:#1e40af; }
    .classification-b2c { background:#fef3c7; color:#92400e; }
    table { width:100%; border-collapse:collapse; margin:24px 0; }
    th { padding:10px 12px; text-align:left; font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; border-bottom:2px solid #e5e7eb; background:#f9fafb; }
    th:nth-child(3) { text-align:center; }
    th:nth-child(4), th:nth-child(5) { text-align:right; }
    .tax-section { display:flex; flex-direction:column; align-items:flex-end; margin-top:16px; }
    .totals-box { width:300px; border:1px solid #e5e7eb; border-radius:8px; padding:12px 16px; }
    .total-row { display:flex; justify-content:space-between; padding:4px 0; font-size:14px; color:#4b5563; }
    .tax-row { display:flex; justify-content:space-between; padding:4px 0; font-size:14px; color:#6366f1; font-weight:500; }
    .total-row.grand { border-top:2px solid #1a1a1a; padding-top:10px; margin-top:6px; font-size:16px; font-weight:700; color:#1a1a1a; }
    .status { display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; text-transform:uppercase; }
    .status-paid { background:#dcfce7; color:#166534; }
    .status-draft { background:#f3f4f6; color:#4b5563; }
    .status-sent { background:#dbeafe; color:#1e40af; }
    .footer { margin-top:60px; padding-top:20px; border-top:1px solid #e5e7eb; text-align:center; font-size:12px; color:#9ca3af; }
    .tax-note { margin-top:24px; padding:12px 16px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; font-size:12px; color:#64748b; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${orgName}</div>
      <div style="margin-top:8px">
        <span class="classification classification-${classification.toLowerCase()}">${classification} Supply</span>
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-number">${invoice.invoiceNumber}</div>
      <div class="meta-row">Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}</div>
      <div class="meta-row"><span class="status status-${invoice.status}">${invoice.status}</span></div>
    </div>
  </div>

  <div class="info-section">
    <div>
      <div class="info-row">
        <div class="info-label">Bill To</div>
        <div class="info-value">${invoice.customerName}</div>
      </div>
      ${gstinRow}
    </div>
    <div>
      ${posRow}
      <div class="info-row">
        <div class="info-label">Supply Type</div>
        <div class="info-value">${invoice.isInterstate ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)'}</div>
      </div>
    </div>
  </div>

  <table>
    <thead><tr><th>Item</th><th>HSN</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
    <tbody>${lineItemRows}</tbody>
  </table>

  <div class="tax-section">
    <div class="totals-box">
      <div class="total-row"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal, currency)}</span></div>
      ${taxRows}
      <div class="total-row grand"><span>Total</span><span>${formatCurrency(invoice.total, currency)}</span></div>
    </div>
  </div>

  <div class="tax-note">
    <strong>Tax Summary:</strong> ${invoice.isInterstate
      ? `IGST @ ${invoice.taxRate}% = ${formatCurrency(invoice.igstAmount || 0, currency)}`
      : `CGST @ ${invoice.taxRate / 2}% = ${formatCurrency(invoice.cgstAmount || 0, currency)} + SGST @ ${invoice.taxRate / 2}% = ${formatCurrency(invoice.sgstAmount || 0, currency)}`
    } on taxable value of ${formatCurrency(invoice.subtotal, currency)}
  </div>

  <div class="footer">Generated by LedgerFlow &bull; ${new Date().toLocaleDateString('en-IN')}</div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
