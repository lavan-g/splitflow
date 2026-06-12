export type ExpenseFormState = {
  success: boolean;
  message: string;
};

export const EXPENSE_FORM_INITIAL_STATE: ExpenseFormState = {
  success: false,
  message: "",
};

export type SplitType = "equal" | "percentage" | "custom";

export type SplitPayloadEntry = {
  userId: string;
  amount: number;
  percentage?: number;
};
