
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency';
import { InvestmentPartner } from '@/types/investment.types';
import { Edit, Trash2, Mail, Phone } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface InvestmentPartnersTableProps {
  partners: InvestmentPartner[];
  onEdit: (partner: InvestmentPartner) => void;
  onDelete: (id: string) => void;
}

const InvestmentPartnersTable: React.FC<InvestmentPartnersTableProps> = ({
  partners,
  onEdit,
  onDelete
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-900 text-green-300';
      case 'inactive': return 'bg-gray-900 text-gray-300';
      case 'pending': return 'bg-yellow-900 text-yellow-300';
      case 'exited': return 'bg-red-900 text-red-300';
      default: return 'bg-gray-900 text-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'investor': return 'bg-blue-900 text-blue-300';
      case 'partner': return 'bg-purple-900 text-purple-300';
      case 'advisor': return 'bg-orange-900 text-orange-300';
      default: return 'bg-gray-900 text-gray-300';
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-md border border-gray-700 bg-gray-800">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700">
            <TableHead className="text-gray-200">Partner</TableHead>
            <TableHead className="text-gray-200">Contact</TableHead>
            <TableHead className="text-gray-200">Investment</TableHead>
            <TableHead className="text-gray-200">Equity</TableHead>
            <TableHead className="text-gray-200">Type</TableHead>
            <TableHead className="text-gray-200">Status</TableHead>
            <TableHead className="text-gray-200">Date</TableHead>
            <TableHead className="text-gray-200 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partners.map((partner) => (
            <TableRow key={partner.id} className="border-gray-700">
              <TableCell>
                <div>
                  <div className="font-medium text-white">{partner.name}</div>
                  {partner.company && (
                    <div className="text-sm text-gray-400">{partner.company}</div>
                  )}
                  {partner.contact_person && (
                    <div className="text-xs text-gray-500">Contact: {partner.contact_person}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {partner.email && (
                    <div className="flex items-center gap-1 text-sm text-gray-300">
                      <Mail className="h-3 w-3" />
                      {partner.email}
                    </div>
                  )}
                  {partner.phone && (
                    <div className="flex items-center gap-1 text-sm text-gray-300">
                      <Phone className="h-3 w-3" />
                      {partner.phone}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium text-white">
                  <CurrencyDisplay amount={partner.investment_amount} />
                </div>
              </TableCell>
              <TableCell>
                <div className="text-white">
                  {partner.equity_percentage ? `${partner.equity_percentage}%` : '-'}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getTypeColor(partner.partnership_type)}>
                  {partner.partnership_type}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(partner.status)}>
                  {partner.status}
                </Badge>
              </TableCell>
              <TableCell className="text-gray-300">
                {new Date(partner.investment_date).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(partner)}
                    className="text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-900 border-gray-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">
                          Delete Investment Partner
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-300">
                          Are you sure you want to delete "{partner.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(partner.id)}
                          disabled={deletingId === partner.id}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {deletingId === partner.id ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {partners.length === 0 && (
        <div className="p-8 text-center text-gray-400">
          No investment partners found. Add your first partner to get started.
        </div>
      )}
    </div>
  );
};

export default InvestmentPartnersTable;
