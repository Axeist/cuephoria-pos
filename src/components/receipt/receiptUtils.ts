import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (element: HTMLElement, billId: string): Promise<void> => {
  if (!element) {
    throw new Error('Receipt element not found');
  }
  
  try {
    // Create a clone of the element to avoid affecting the visible DOM
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Temporarily add the clone to the document
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    document.body.appendChild(clonedElement);
    
    const canvas = await html2canvas(clonedElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    });
    
    // Remove the clone
    document.body.removeChild(clonedElement);
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    
    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
    
    // Add additional pages if content is longer than one page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
    
    const fileName = `Cuephoria_Receipt_${billId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    return;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

export const handlePrint = (printContent: string): void => {
  try {
    // Create a new window for printing instead of replacing body content
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
            
            body { 
              font-family: 'Arial', sans-serif;
              padding: 20px;
              background: white;
              color: black;
            }
            
            @media print {
              body {
                padding: 0;
              }
              
              .no-print {
                display: none !important;
              }
            }
            
            .receipt-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 30px;
            }
            
            .receipt-header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            
            .receipt-header h1 {
              font-size: 32px;
              font-weight: bold;
              color: #6E59A5;
              margin-bottom: 10px;
            }
            
            .receipt-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              padding: 8px 0;
            }
            
            .receipt-total {
              border-top: 2px solid #333;
              margin-top: 20px;
              padding-top: 15px;
              font-weight: bold;
              font-size: 18px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            
            table th,
            table td {
              text-align: left;
              padding: 10px;
              border-bottom: 1px solid #ddd;
            }
            
            table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            
            .text-center {
              text-align: center;
            }
            
            .text-right {
              text-align: right;
            }
            
            .font-bold {
              font-weight: bold;
            }
            
            .mt-4 {
              margin-top: 20px;
            }
            
            .text-sm {
              font-size: 14px;
            }
            
            .text-xs {
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
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
