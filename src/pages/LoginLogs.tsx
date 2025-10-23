import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MapPin, Monitor, Clock, Shield, Users, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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

const LoginLogs = () => {
  const navigate = useNavigate();
  const { getLoginLogs, deleteLoginLog } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, allLogs]);

  const loadLogs = async () => {
    setIsLoading(true);
    const data = await getLoginLogs();
    setAllLogs(data);
    setIsLoading(false);
  };

  const applyFilter = () => {
    let filteredData = allLogs;
    if (filter === 'success') {
      filteredData = allLogs.filter(log => log.login_success);
    } else if (filter === 'failed') {
      filteredData = allLogs.filter(log => !log.login_success);
    }
    setLogs(filteredData);
  };

  const handleDeleteClick = (logId: string) => {
    setLogToDelete(logId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (logToDelete) {
      const success = await deleteLoginLog(logToDelete);
      if (success) {
        toast({
          title: 'Success',
          description: 'Login log deleted successfully',
        });
        loadLogs();
      }
    }
    setDeleteDialogOpen(false);
    setLogToDelete(null);
  };

  return (
    <div className="min-h-screen bg-cuephoria-dark p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-cuephoria-purple/20 mb-4"
          onClick={() => navigate('/login')}
        >
          <ArrowLeft size={16} />
          <span>Back to Login</span>
        </Button>

        <h1 className="text-3xl font-bold gradient-text mb-2">Login Logs</h1>
        <p className="text-muted-foreground mb-4">Track all login activities and user sessions</p>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-cuephoria-purple hover:bg-cuephoria-purple/80' : ''}
          >
            All Attempts ({allLogs.length})
          </Button>
          <Button
            variant={filter === 'success' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('success')}
            className={filter === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            Successful ({allLogs.filter(l => l.login_success).length})
          </Button>
          <Button
            variant={filter === 'failed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('failed')}
            className={filter === 'failed' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            Failed ({allLogs.filter(l => !l.login_success).length})
          </Button>
        </div>
      </div>

      {/* Logs List */}
      <div className="max-w-7xl mx-auto space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cuephoria-purple mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <Card className="bg-cuephoria-darker border-cuephoria-lightpurple/30">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {filter === 'all' 
                  ? 'No login logs found' 
                  : `No ${filter} login attempts found`}
              </p>
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => (
            <Card 
              key={log.id} 
              className={`bg-cuephoria-darker border-cuephoria-lightpurple/30 hover:border-cuephoria-lightpurple/60 transition-colors relative ${
                !log.login_success ? 'border-red-500/30 hover:border-red-500/60' : ''
              }`}
            >
              <CardContent className="p-6">
                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-red-400 hover:text-red-600 hover:bg-red-500/10"
                  onClick={() => handleDeleteClick(log.id)}
                >
                  <Trash2 size={18} />
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pr-12">
                  {/* User Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-cuephoria-lightpurple">
                      {log.is_admin ? <Shield size={16} /> : <Users size={16} />}
                      <span className="text-xs font-medium">USER</span>
                    </div>
                    <p className="font-semibold">{log.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.is_admin ? 'Admin' : 'Staff'}
                    </p>
                    <div className="mt-2">
                      {log.login_success ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-cuephoria-orange">
                      <MapPin size={16} />
                      <span className="text-xs font-medium">LOCATION</span>
                    </div>
                    <p className="font-semibold">{log.city || 'Unknown'}, {log.country || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      IP: {log.ip_address || 'N/A'}
                    </p>
                    {log.isp && (
                      <p className="text-xs text-muted-foreground">ISP: {log.isp}</p>
                    )}
                  </div>

                  {/* Device Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-accent">
                      <Monitor size={16} />
                      <span className="text-xs font-medium">DEVICE</span>
                    </div>
                    <p className="font-semibold">{log.device_type || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.browser} {log.browser_version}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.os} {log.os_version}
                    </p>
                  </div>

                  {/* Time Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-cuephoria-green">
                      <Clock size={16} />
                      <span className="text-xs font-medium">TIME</span>
                    </div>
                    <p className="font-semibold">
                      {format(new Date(log.login_time), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.login_time), 'hh:mm a')}
                    </p>
                    {log.timezone && (
                      <p className="text-xs text-muted-foreground">{log.timezone}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-cuephoria-darker border-red-500/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 size={20} />
              Delete Login Log
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this login log? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LoginLogs;
