export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function calculateRentBalance(
  payments: { dueDate: Date | string; amount: number; paidAmount: number }[]
): number {
  const now = new Date();
  return payments
    .filter((p) => new Date(p.dueDate) <= now)
    .reduce((balance, p) => balance + (p.amount - p.paidAmount), 0);
}
