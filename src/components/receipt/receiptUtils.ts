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
    
    // Create a clone of the element
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Hide edit buttons and UI elements in clone
    const elementsToHide = clonedElement.querySelectorAll('.no-print, button, .edit-button');
    elementsToHide.forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
    
    // Set optimal styling for PDF
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    clonedElement.style.width = '210mm'; // A4 width
    clonedElement.style.padding = '10mm';
    clonedElement.style.backgroundColor = '#ffffff';
    clonedElement.style.color = '#000000';
    
    document.body.appendChild(clonedElement);
    
    // Wait for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const canvas = await html2canvas(clonedElement, {
      scale: 3, // Higher quality
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: false,
      imageTimeout: 0,
      removeContainer: false,
      windowWidth: 794, // A4 width in pixels at 96 DPI
      windowHeight: 1123 // A4 height in pixels at 96 DPI
    });
    
    // Remove the clone and loading indicator
    document.body.removeChild(clonedElement);
    document.body.removeChild(loadingDiv);
    
    // Create PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95); // Use JPEG with 95% quality for smaller file
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    
    // Add first page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
    
    // Add additional pages if content is longer than one page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }
    
    // Format filename: Cuephoria_Receipt_CustomerName_BillID.pdf
    const sanitizedCustomerName = customerName.replace(/[^a-zA-Z0-9]/g, '_');
    const shortBillId = billId.substring(0, 8).toUpperCase();
    const fileName = `Cuephoria_Receipt_${sanitizedCustomerName}_${shortBillId}.pdf`;
    
    pdf.save(fileName);
    
    return;
  } catch (error) {
    // Remove loading indicator if error occurs
    const loadingDiv = document.querySelector('div[style*="z-index:99999"]');
    if (loadingDiv) {
      document.body.removeChild(loadingDiv);
    }
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

export const handlePrint = (printContent: string): void => {
  try {
    // Create a new window for printing with optimized print styles
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
              margin: 10mm;
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
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background: white;
            }
            
            /* Header Styles */
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
            
            /* Borders */
            .border-b-2 {
              border-bottom: 2px solid #333;
            }
            
            .border-t-2 {
              border-top: 2px solid #333;
            }
            
            .border-dashed {
              border-style: dashed !important;
            }
            
            .border-gray-400 {
              border-color: #9ca3af;
            }
            
            /* Spacing */
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-3 { margin-bottom: 12px; }
            .mb-4 { margin-bottom: 16px; }
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
            
            /* Text Alignment */
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            
            /* Text Sizes */
            .text-xs { font-size: 11px; }
            .text-sm { font-size: 13px; }
            .text-base { font-size: 15px; }
            .text-lg { font-size: 17px; }
            .text-xl { font-size: 20px; }
            .text-2xl { font-size: 24px; }
            .text-3xl { font-size: 30px; }
            .text-4xl { font-size: 36px; }
            
            /* Font Weights */
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            
            /* Colors */
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-800 { color: #1f2937; }
            
            /* Background Colors */
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-amber-50 { background-color: #fffbeb; }
            
            /* Flex & Grid */
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
            
            /* Table Styles */
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
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
            
            table tr:last-child td {
              border-bottom: none;
            }
            
            /* Rounded Corners */
            .rounded { border-radius: 4px; }
            .rounded-lg { border-radius: 8px; }
            
            /* Lists */
            ul {
              list-style-position: inside;
              padding-left: 0;
            }
            
            ul li {
              margin: 4px 0;
            }
            
            /* Icons - hide in print */
            svg {
              display: none;
            }
            
            /* Hide edit button and other UI elements */
            .no-print,
            button,
            .edit-button {
              display: none !important;
            }
            
            /* Specific receipt styles */
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
            
            /* Border styles */
            .border {
              border: 1px solid #d1d5db;
            }
            
            .border-amber-300 {
              border-color: #fcd34d;
            }
            
            .border-gray-200 {
              border-color: #e5e7eb;
            }
            
            /* Prevent page breaks in important sections */
            .receipt-header,
            table,
            .payment-summary {
              page-break-inside: avoid;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              
              .receipt-container {
                padding: 10px;
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
              }, 250);
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
