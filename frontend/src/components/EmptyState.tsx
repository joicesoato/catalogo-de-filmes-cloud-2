import { Link } from "react-router-dom";

export default function EmptyState({ title, description, action }: {
  title: string;
  description: string;
  action?: { label: string; to: string };
}) {
  return (
    <section className="empty-state">
      <span className="empty-mark" aria-hidden="true">F</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <Link className="button button-secondary" to={action.to}>{action.label}</Link>}
    </section>
  );
}