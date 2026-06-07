import type { BudgetCategory, Expense } from '../types';

export function totalPlanned(categories: BudgetCategory[]): number {
  return categories.reduce((sum, c) => sum + c.plannedAmount, 0);
}

export function totalActual(categories: BudgetCategory[]): number {
  return categories.reduce((sum, c) => sum + c.actualAmount, 0);
}

export function categoryActual(categoryId: string, expenses: Expense[]): number {
  return expenses
    .filter((e) => e.categoryId === categoryId)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
