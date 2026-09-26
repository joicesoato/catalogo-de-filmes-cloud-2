export default function Toast({ message, tone = "info" }: {
  message: string;
  tone?: "success" | "error" | "info";
}) {
  if (!message) return null;
  return <div className={`toast toast-${tone}`} role="status" aria-live="polite">{message}</div>;
}