
import React from 'react';
import SummaryDashboard from './SummaryDashboard';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

interface BusinessSummaryReportProps {
  startDate?: Date;
  endDate?: Date;
  onDownload: () => void;
}

const BusinessSummaryReport: React.FC<BusinessSummaryReportProps> = ({ 
  startDate, 
  endDate,
  onDownload 
}) => {
  // Current date for display
  const currentDate = new Date();

  // Handle download of the Excel report
  const handleDownloadExcel = () => {
    try {
      // Call the passed onDownload function
      onDownload();
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };
  
  return (
    <div className="w-full space-y-6">
      {/* Header with export button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Business Summary</h2>
          <p className="text-muted-foreground">
            {startDate && endDate 
              ? `From ${format(startDate, 'PP')} to ${format(endDate, 'PP')}`
              : startDate
                ? `From ${format(startDate, 'PP')}`
                : endDate
                  ? `Until ${format(endDate, 'PP')}`
                  : `${format(currentDate, 'MMMM yyyy')}`
            }
          </p>
        </div>
        <Button
          onClick={handleDownloadExcel}
          className="gap-2 bg-purple-500 hover:bg-purple-600"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Interactive Dashboard */}
      <SummaryDashboard startDate={startDate} endDate={endDate} />
    </div>
  );
};

export default BusinessSummaryReport;
