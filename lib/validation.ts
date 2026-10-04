import { isCategory, type Category, type ExpenseInput } from './types';
import { isValidISODate } from './utils';

export interface ExpenseFormValues {
  date: string;
  amount: string;
  category: Category | '';
  description: string;
}

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, string>>;

export const MAX_AMOUNT = 1_000_000;
export const MAX_DESCRIPTION_LENGTH = 100;

function normalizeAmount(amount: string): string {
  return amount.trim().replace(/,/g, '');
}

export function validateExpense(values: ExpenseFormValues, today: string): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {};

  if (!values.date) {
    errors.date = 'Date is required.';
  } else if (!isValidISODate(values.date)) {
    errors.date = 'Enter a valid date.';
  } else if (values.date > today) {
    errors.date = 'Date cannot be in the future.';
  } else if (values.date < '2000-01-01') {
    errors.date = 'Date must be in the year 2000 or later.';
  }

  const amount = normalizeAmount(values.amount);
  if (!amount) {
    errors.amount = 'Amount is required.';
  } else if (!/^\d+(\.\d{0,2})?$/.test(amount)) {
    errors.amount = 'Enter a valid amount with up to 2 decimals.';
  } else if (Number(amount) <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  } else if (Number(amount) > MAX_AMOUNT) {
    errors.amount = 'Amount cannot exceed $1,000,000.';
  }

  if (!values.category || !isCategory(values.category)) {
    errors.category = 'Choose a category.';
  }

  const description = values.description.trim();
  if (!description) {
    errors.description = 'Description is required.';
  } else if (description.length < 2) {
    errors.description = 'Description must be at least 2 characters.';
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  }

  return errors;
}

/** Converts already-validated form values into an ExpenseInput. */
export function toExpenseInput(values: ExpenseFormValues): ExpenseInput {
  return {
    date: values.date,
    amount: Math.round(Number(normalizeAmount(values.amount)) * 100) / 100,
    category: values.category as Category,
    description: values.description.trim().replace(/\s+/g, ' '),
  };
}
