import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (element: HTMLElement, billId: string, customerName: string): Promise<void> => {
  if (!element) {
    throw new Error('Receipt element not found');
  }
  
  try {
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = '<div style="font-size:16px;font-weight:bold;">Generating PDF...</div><div style="font-size:12px;margin-top:8px;color:#666;">Please wait</div>';
    loadingDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px 40px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:99999;text-align:center;';
    document.body.appendChild(loadingDiv);
    
    // Find the receipt content (skip the success message and action buttons)
    const receiptContent = element.querySelector('[class*="p-6"]') as HTMLElement;
    if (!receiptContent) {
      throw new Error('Receipt content not found');
    }
    
    // Create a complete clone for PDF generation
    const clonedElement = receiptContent.cloneNode(true) as HTMLElement;
    
    // Hide all no-print elements in the clone
    const elementsToHide = clonedElement.querySelectorAll('.no-print, button, .edit-button');
    elementsToHide.forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
    
    // Create a temporary container with fixed dimensions
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '210mm'; // A4 width
    tempContainer.style.minHeight = '297mm'; // A4 height
    tempContainer.style.padding = '15mm';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.color = '#000000';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.fontSize = '14px';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.overflow = 'visible';
    
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);
    
    // Wait for layout to settle
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get the actual height of the content
    const contentHeight = clonedElement.scrollHeight;
    tempContainer.style.height = `${contentHeight + 60}px`; // Add padding
    
    // Wait again for height adjustment
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Capture with html2canvas
    const canvas = await html2canvas(tempContainer, {
      scale: 2.5,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: false,
      imageTimeout: 0,
      removeContainer: false,
      windowWidth: 794, // A4 width in pixels (210mm at 96 DPI)
      windowHeight: contentHeight + 100,
      width: tempContainer.offsetWidth,
      height: tempContainer.offsetHeight,
      scrollX: 0,
      scrollY: 0
    });
    
    // Remove temporary container and loading indicator
    document.body.removeChild(tempContainer);
    document.body.removeChild(loadingDiv);
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 0; // No margins since content already has padding
    
    const contentWidth = pageWidth;
    const contentHeightMM = pageHeight;
    
    // Calculate dimensions
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;
    
    // Convert canvas to high quality image
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Calculate number of pages needed
    const totalPages = Math.ceil(imgHeight / contentHeightMM);
    
    console.log(`Generating PDF: ${totalPages} page(s), Content height: ${imgHeight}mm`);
    
    // Add pages
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }
      
      const yOffset = -page * contentHeightMM;
      
      pdf.addImage(
        imgData,
        'JPEG',
        margin,
        yOffset,
        imgWidth,
        imgHeight,
        undefined,
        'FAST'
      );
    }
    
    // Format filename
    const sanitizedCustomerName = customerName.replace(/[^a-zA-Z0-9]/g, '_');
    const shortBillId = billId.substring(0, 8).toUpperCase();
    const fileName = `Cuephoria_Receipt_${sanitizedCustomerName}_${shortBillId}.pdf`;
    
    pdf.save(fileName);
    
    return;
  } catch (error) {
    // Remove loading indicator if error occurs
    const loadingDiv = document.querySelector('div[style*="z-index:99999"]');
    if (loadingDiv && loadingDiv.parentNode) {
      document.body.removeChild(loadingDiv);
    }
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

export const handlePrint = (printContent: string): void => {
  try {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Cuephoria Receipt</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: A4;
              margin: 15mm;
            }
            
            html, body {
              width: 100%;
              height: 100%;
              font-family: 'Arial', 'Helvetica', sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color: #000;
            }
            
            body { 
              background: white;
              padding: 0;
              margin: 0;
            }
            
            .receipt-container {
              max-width: 190mm;
              margin: 0 auto;
              padding: 10mm;
              background: white;
            }
            
            h1 {
              font-size: 36px;
              font-weight: bold;
              color: #6E59A5 !important;
              text-align: center;
              margin-bottom: 5px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            h2 {
              font-size: 24px;
              font-weight: bold;
              text-align: center;
              margin: 15px 0;
            }
            
            h3 {
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
            }
            
            h4 {
              font-size: 14px;
              font-weight: 600;
              margin: 8px 0;
            }
            
            p {
              margin: 4px 0;
              line-height: 1.5;
            }
            
            .border-b-2 {
              border-bottom: 2px solid #333;
            }
            
            .border-t-2 {
              border-top: 2px solid #333;
              page-break-inside: avoid;
            }
            
            .border-dashed {
              border-style: dashed !important;
            }
            
            .border-gray-400 {
              border-color: #9ca3af;
            }
            
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-3 { margin-bottom: 12px; }
            .mb-4 { margin-bottom: 16px; }
            .mb-6 { margin-bottom: 24px; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .mt-3 { margin-top: 12px; }
            .mt-4 { margin-top: 16px; }
            .mt-6 { margin-top: 24px; }
            .pb-2 { padding-bottom: 8px; }
            .pb-3 { padding-bottom: 12px; }
            .pb-4 { padding-bottom: 16px; }
            .pt-2 { padding-top: 8px; }
            .pt-3 { padding-top: 12px; }
            .pt-4 { padding-top: 16px; }
            .p-2 { padding: 8px; }
            .p-3 { padding: 12px; }
            
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            
            .text-xs { font-size: 11px; }
            .text-sm { font-size: 13px; }
            .text-base { font-size: 15px; }
            .text-lg { font-size: 17px; }
            .text-xl { font-size: 20px; }
            .text-2xl { font-size: 24px; }
            .text-3xl { font-size: 30px; }
            .text-4xl { font-size: 36px; }
            
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-800 { color: #1f2937; }
            
            .bg-gray-50 { 
              background-color: #f9fafb;
              page-break-inside: avoid;
            }
            .bg-amber-50 { background-color: #fffbeb; }
            .bg-green-100 { background-color: #dcfce7; }
            .bg-blue-100 { background-color: #dbeafe; }
            .bg-orange-100 { background-color: #ffedd5; }
            
            .text-green-800 { color: #166534; }
            .text-blue-800 { color: #1e40af; }
            .text-orange-800 { color: #9a3412; }
            
            .flex {
              display: flex;
            }
            
            .items-center {
              align-items: center;
            }
            
            .justify-center {
              justify-content: center;
            }
            
            .justify-between {
              justify-content: space-between;
            }
            
            .gap-1 { gap: 4px; }
            .gap-2 { gap: 8px; }
            .gap-3 { gap: 12px; }
            
            .grid {
              display: grid;
            }
            
            .grid-cols-2 {
              grid-template-columns: repeat(2, 1fr);
            }
            
            .space-y-1 > * + * { margin-top: 4px; }
            .space-y-2 > * + * { margin-top: 8px; }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
              page-break-inside: auto;
            }
            
            table th,
            table td {
              text-align: left;
              padding: 10px 8px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 13px;
            }
            
            table th {
              background-color: #f3f4f6;
              font-weight: 600;
            }
            
            table tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            table tr:last-child td {
              border-bottom: none;
            }
            
            .rounded { 
              border-radius: 4px;
            }
            .rounded-lg { 
              border-radius: 8px;
            }
            .rounded-full {
              border-radius: 9999px;
            }
            
            ul {
              list-style-position: inside;
              padding-left: 0;
              page-break-inside: avoid;
            }
            
            ul li {
              margin: 4px 0;
            }
            
            svg {
              display: none;
            }
            
            .no-print,
            button,
            .edit-button {
              display: none !important;
            }
            
            .uppercase {
              text-transform: uppercase;
            }
            
            .tracking-wider {
              letter-spacing: 0.05em;
            }
            
            .font-mono {
              font-family: 'Courier New', monospace;
            }
            
            .italic {
              font-style: italic;
            }
            
            .border {
              border: 1px solid #d1d5db;
            }
            
            .border-amber-300 {
              border-color: #fcd34d;
            }
            
            .border-gray-200 {
              border-color: #e5e7eb;
            }
            
            .border-gray-300 {
              border-color: #d1d5db;
            }
            
            .receipt-header,
            .payment-summary,
            .terms-section,
            .payment-method-section {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            tbody {
              page-break-inside: auto;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              
              .receipt-container {
                padding: 5mm;
              }
              
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  } catch (error) {
    console.error('Error printing receipt:', error);
    throw new Error('Failed to print receipt. Please check your browser settings.');
  }
};
