
import React from 'react';
import { Tournament } from '@/types/tournament.types';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash, Trophy, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';

interface TournamentListProps {
  tournaments: Tournament[];
  onEdit: (tournament: Tournament) => void;
  onDelete: (id: string) => void;
}

const TournamentList: React.FC<TournamentListProps> = ({ 
  tournaments, 
  onEdit, 
  onDelete 
}) => {
  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Trophy className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium">No tournaments found</h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          Create your first tournament by clicking the "Add Tournament" button above.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: Tournament['status']) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Upcoming</Badge>;
      case 'in-progress':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Game Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Players</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tournaments.map((tournament) => (
            <TableRow key={tournament.id}>
              <TableCell className="font-medium">{tournament.name}</TableCell>
              <TableCell>
                {tournament.gameType === 'PS5' ? (
                  <span>{tournament.gameTitle}</span>
                ) : (
                  <span>{tournament.gameVariant}</span>
                )}
              </TableCell>
              <TableCell>{format(new Date(tournament.date), 'dd MMM yyyy')}</TableCell>
              <TableCell>{tournament.players.length}</TableCell>
              <TableCell>{formatCurrency(tournament.budget)}</TableCell>
              <TableCell>{getStatusBadge(tournament.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(tournament)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500" onClick={() => onDelete(tournament.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TournamentList;
