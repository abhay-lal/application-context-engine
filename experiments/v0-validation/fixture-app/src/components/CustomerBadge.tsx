import type { Customer } from '../types';

interface CustomerBadgeProps {
  customer: Customer;
}

export function CustomerBadge({ customer }: CustomerBadgeProps) {
  return (
    <span className="customer-badge">
      {customer.name} ({customer.email})
    </span>
  );
}
