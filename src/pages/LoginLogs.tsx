import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, User, MapPin, Monitor, Clock, Shield, Users, Trash2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    const data = await getLoginLogs();
    setLogs(data);
    setIsLoading(false);
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
        loadLogs(); // Refresh the logs
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
        <p className="text-muted-foreground">Track all login activities and user sessions</p>
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
              <p className="text-muted-foreground">No login logs found</p>
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id} className="bg-cuephoria-darker border-cuephoria-lightpurple/30 hover:border-cuephoria-lightpurple/60 transition-colors relative">
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
