import { Link } from 'react-router-dom';
import { getInvoices } from '../api/mockData';

export function InvoiceListPage() {
  const invoices = getInvoices();

  return (
    <div>
      <h1>Invoices</h1>
      <ul>
        {invoices.map((invoice) => (
          <li key={invoice.id}>
            <Link to={`/invoices/${invoice.id}`}>
              {invoice.id} — {invoice.customerName} (${invoice.amount})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
