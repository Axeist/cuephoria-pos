
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface BillEditInfo {
  editorName: string;
  timestamp: Date;
  changes: string;
}

interface BillEditAuditProps {
  edits?: BillEditInfo[];
  onSaveEdit?: (editorName: string, changes: string) => void;
  isEditing?: boolean;
}

const BillEditAudit: React.FC<BillEditAuditProps> = ({ 
  edits = [], 
  onSaveEdit,
  isEditing = false
}) => {
  const [editorName, setEditorName] = useState('');
  const [editReason, setEditReason] = useState('');
  
  const handleSaveEditInfo = () => {
    if (editorName.trim() && onSaveEdit) {
      onSaveEdit(editorName, editReason || 'Bill edited');
      setEditorName('');
      setEditReason('');
    }
  };
  
  if (edits.length === 0 && !isEditing) {
    return null;
  }
  
  return (
    <div className="mt-4 pt-3 border-t border-gray-700">
      <h3 className="text-sm font-medium mb-2">Edit History</h3>
      
      {isEditing && (
        <div className="bg-gray-800/30 p-3 rounded-md border border-gray-700 mb-3 space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Editor Name *</label>
            <input
              type="text"
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              placeholder="Enter your name"
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Reason for Edit</label>
            <textarea
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              placeholder="Explain why this bill is being edited"
              rows={2}
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
            />
          </div>
          <Button
            variant="default"
            size="sm"
            className="w-full h-8 bg-cuephoria-purple hover:bg-cuephoria-purple/80"
            onClick={handleSaveEditInfo}
            disabled={!editorName.trim()}
          >
            Save Edit Information
          </Button>
        </div>
      )}
      
      {edits.length > 0 && (
        <div className="space-y-2 text-sm">
          {edits.map((edit, index) => (
            <div key={index} className="p-2 bg-gray-800/20 rounded border border-gray-700/50">
              <div className="flex justify-between">
                <span className="font-medium">{edit.editorName}</span>
                <span className="text-xs text-gray-400">
                  {edit.timestamp.toLocaleDateString()} {edit.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1">{edit.changes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BillEditAudit;
