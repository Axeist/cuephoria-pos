import React, { useState, useEffect } from 'react';
import { StockLog } from '@/types/stockLog.types';
import { getStockLogs } from '@/utils/stockLogger';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, AlertCircle, Package, Search, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

const ADMIN_PIN = '2101';

const StockLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<StockLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<StockLog | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [deleteAction, setDeleteAction] = useState<'single' | 'all' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = logs.filter(log => 
        log.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.performedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLogs(filtered);
    } else {
      setFilteredLogs(logs);
    }
  }, [searchTerm, logs]);

  const loadLogs = () => {
    const allLogs = getStockLogs();
    const sortedLogs = allLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setLogs(sortedLogs);
    setFilteredLogs(sortedLogs);
  };

  const handleDeleteClick = (log: StockLog) => {
    setSelectedLog(log);
    setDeleteAction('single');
    setShowDeleteDialog(true);
  };

  const handleClearAllClick = () => {
    setDeleteAction('all');
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteDialog(false);
    setShowPinDialog(true);
  };

  const handlePinSubmit = () => {
    if (pinInput !== ADMIN_PIN) {
      toast({
        title: 'Incorrect PIN',
        description: 'The PIN you entered is incorrect. Please try again.',
        variant: 'destructive',
      });
      setPinInput('');
      return;
    }

    // PIN is correct, proceed with deletion
    if (deleteAction === 'single' && selectedLog) {
      deleteSingleLog(selectedLog.id);
    } else if (deleteAction === 'all') {
      clearAllLogs();
    }

    // Reset states
    setPinInput('');
    setShowPinDialog(false);
    setSelectedLog(null);
    setDeleteAction(null);
  };

  const deleteSingleLog = (logId: string) => {
    try {
      const storedLogs = localStorage.getItem('stockLogs');
      if (storedLogs) {
        const allLogs: StockLog[] = JSON.parse(storedLogs);
        const updatedLogs = allLogs.filter(log => log.id !== logId);
        localStorage.setItem('stockLogs', JSON.stringify(updatedLogs));
        
        toast({
          title: 'Log Deleted',
          description: 'Stock log entry has been removed successfully.',
        });
        
        loadLogs();
      }
    } catch (error) {
      console.error('Error deleting log:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete log entry.',
        variant: 'destructive',
      });
    }
  };

  const clearAllLogs = () => {
    try {
      localStorage.removeItem('stockLogs');
      localStorage.removeItem('stockSnapshotInitialized');
      localStorage.removeItem('lastOpeningSnapshotDate');
      localStorage.removeItem('lastClosingSnapshotDate');
      
      toast({
        title: 'All Logs Cleared',
        description: 'All stock logs and snapshot data have been removed.',
      });
      
      loadLogs();
    } catch (error) {
      console.error('Error clearing logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear logs.',
        variant: 'destructive',
      });
    }
  };

  const getChangeTypeIcon = (type: StockLog['changeType']) => {
    switch (type) {
      case 'addition':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'deduction':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'adjustment':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'initial':
        return <Package className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getChangeTypeBadge = (type: StockLog['changeType']) => {
    const variants: Record<StockLog['changeType'], 'default' | 'destructive' | 'secondary'> = {
      addition: 'default',
      deduction: 'destructive',
      adjustment: 'secondary',
      initial: 'secondary',
    };
    return (
      <Badge variant={variants[type]} className="capitalize">
        {type}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {logs.length > 0 && (
          <Button 
            variant="destructive" 
            onClick={handleClearAllClick}
            className="whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Logs
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredLogs.length} of {logs.length} log entries
      </div>

      <ScrollArea className="h-[600px] w-full rounded-md border">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No stock change logs found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchTerm ? 'Try adjusting your search' : 'Stock changes will appear here'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Previous</TableHead>
                <TableHead className="text-center">Change</TableHead>
                <TableHead className="text-right">New</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {format(new Date(log.timestamp), 'dd/MM/yy HH:mm')}
                  </TableCell>
                  <TableCell className="font-medium">{log.productName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getChangeTypeIcon(log.changeType)}
                      {getChangeTypeBadge(log.changeType)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {log.previousStock}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        log.quantityChanged >= 0
                          ? 'text-green-600 font-semibold'
                          : 'text-red-600 font-semibold'
                      }
                    >
                      {log.quantityChanged >= 0 ? '+' : ''}
                      {log.quantityChanged}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {log.newStock}
                  </TableCell>
                  <TableCell className="text-sm">{log.performedBy}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {log.notes || log.reason || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(log)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAction === 'single' 
                ? `Are you sure you want to delete this stock log entry for "${selectedLog?.productName}"? This action cannot be undone.`
                : 'Are you sure you want to delete ALL stock logs? This will permanently remove all stock change history and cannot be undone.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setSelectedLog(null);
              setDeleteAction(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Verification Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter PIN to Confirm</DialogTitle>
            <DialogDescription>
              Enter the admin PIN to authorize this deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Admin PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter 4-digit PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={4}
                className="text-center text-2xl tracking-widest"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && pinInput.length === 4) {
                    handlePinSubmit();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPinDialog(false);
                setPinInput('');
                setSelectedLog(null);
                setDeleteAction(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePinSubmit}
              disabled={pinInput.length !== 4}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockLogsViewer;
