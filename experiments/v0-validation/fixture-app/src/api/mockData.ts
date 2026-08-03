import type { Customer, Invoice } from '../types';

const invoices: Invoice[] = [
  { id: 'INV-001', status: 'Pending', amount: 1240, customerName: 'Jane Doe', canApprove: true },
  { id: 'INV-002', status: 'Approved', amount: 860, customerName: 'Bruce Wayne', canApprove: false },
  { id: 'INV-003', status: 'Pending', amount: 430, customerName: 'Diana Prince', canApprove: true },
];

const customers: Record<string, Customer> = {
  'INV-001': { id: 'CUST-1', name: 'Jane Doe', email: 'jane@example.com' },
  'INV-002': { id: 'CUST-2', name: 'Bruce Wayne', email: 'bruce@example.com' },
  'INV-003': { id: 'CUST-3', name: 'Diana Prince', email: 'diana@example.com' },
};

export function getInvoices(): Invoice[] {
  return invoices;
}

export function getInvoiceById(id: string): Invoice | undefined {
  return invoices.find((invoice) => invoice.id === id);
}

export function getCustomerForInvoice(invoiceId: string): Customer | undefined {
  return customers[invoiceId];
}

export async function approveInvoice(invoiceId: string): Promise<void> {
  const invoice = getInvoiceById(invoiceId);
  if (invoice) invoice.status = 'Approved';
}

export async function rejectInvoice(invoiceId: string): Promise<void> {
  const invoice = getInvoiceById(invoiceId);
  if (invoice) invoice.status = 'Rejected';
}

export async function addComment(invoiceId: string, comment: string): Promise<void> {
  console.log(`Comment on ${invoiceId}: ${comment}`);
}
