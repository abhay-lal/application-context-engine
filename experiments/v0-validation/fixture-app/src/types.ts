export type InvoiceStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Invoice {
  id: string;
  status: InvoiceStatus;
  amount: number;
  customerName: string;
  canApprove: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
}
