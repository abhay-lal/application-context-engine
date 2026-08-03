import { type FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { addComment, approveInvoice, getCustomerForInvoice, getInvoiceById, rejectInvoice } from '../api/mockData';
import { CustomerBadge } from '../components/CustomerBadge';

export function InvoiceDetailPage() {
  const { id } = useParams();
  const invoice = getInvoiceById(id ?? '');
  const customer = getCustomerForInvoice(id ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comment, setComment] = useState('');

  if (!invoice || !customer) {
    return <p>Invoice not found.</p>;
  }

  async function handleApprove() {
    setIsSubmitting(true);
    await approveInvoice(invoice!.id);
    setIsSubmitting(false);
  }

  async function handleReject() {
    setIsSubmitting(true);
    await rejectInvoice(invoice!.id);
    setIsSubmitting(false);
  }

  function handleAddComment(e: FormEvent) {
    e.preventDefault();
    addComment(invoice!.id, comment);
    setComment('');
  }

  return (
    <div>
      <h1>Invoice {invoice.id}</h1>
      <p>Status: {invoice.status}</p>
      <p>Amount: ${invoice.amount}</p>
      <CustomerBadge customer={customer} />

      <div>
        <button onClick={handleApprove} disabled={!invoice.canApprove || isSubmitting}>
          Approve Invoice
        </button>
        <button onClick={handleReject} disabled={!invoice.canApprove || isSubmitting}>
          Reject Invoice
        </button>
      </div>

      <form onSubmit={handleAddComment}>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" />
        <button type="submit">Add Comment</button>
      </form>
    </div>
  );
}
