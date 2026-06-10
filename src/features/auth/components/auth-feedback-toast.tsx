type AuthFeedbackToastProps = {
  message: string;
  success: boolean;
};

export function AuthFeedbackToast({ message, success }: AuthFeedbackToastProps) {
  return (
    <p
      role="status"
      className={`text-sm ${success ? "text-emerald-300" : "text-rose-300"}`}
    >
      {message}
    </p>
  );
}
