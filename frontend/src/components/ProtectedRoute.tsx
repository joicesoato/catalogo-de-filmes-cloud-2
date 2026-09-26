import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "./Loading";
import EmptyState from "./EmptyState";

export default function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Conferindo sua sessão" />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") {
    return <main className="page-shell"><EmptyState title="Acesso restrito" description="Sua conta não tem acesso à área administrativa." action={{ label: "Voltar ao catálogo", to: "/catalog" }} /></main>;
  }
  return <Outlet />;
}