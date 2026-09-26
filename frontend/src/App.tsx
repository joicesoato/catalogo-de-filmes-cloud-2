import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Loading from "./components/Loading";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import Admin from "./pages/Admin";
import Catalog from "./pages/Catalog";
import Favorites from "./pages/Favorites";
import ForgotPassword from "./pages/ForgotPassword";
import Login from "./pages/Login";
import MovieDetails from "./pages/MovieDetails";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Conferindo sua sessão" />;
  return <Navigate to={user ? "/catalog" : "/login"} replace />;
}

function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Carregando" />;
  if (user) return <Navigate to="/catalog" replace />;
  return <Outlet />;
}

function ApplicationLayout() {
  return (
    <div className="app-layout">
      <Header />
      <main className="page-shell"><Outlet /></main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<ForgotPassword />} />
      </Route>
      <Route path="/reset" element={<ResetPassword />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<ApplicationLayout />}>
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}