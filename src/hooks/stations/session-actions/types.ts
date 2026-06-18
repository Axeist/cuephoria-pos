
import { Station, Session, Customer, SessionResult } from '@/types/pos.types';
import React from 'react';

export interface SessionActionsProps {
  stations: Station[];
  setStations: React.Dispatch<React.SetStateAction<Station[]>>;
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  updateCustomer: (customer: Customer) => void;
}
