export type AuthFormState = {
  success: boolean;
  message: string;
  showCreateAccountCta: boolean;
};

export const AUTH_FORM_INITIAL_STATE: AuthFormState = {
  success: false,
  message: "",
  showCreateAccountCta: false,
};
