export const GMAIL_VALIDATION_MESSAGE = "Enter a valid Gmail address.";

export function isValidGmail(email: string) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim());
}
