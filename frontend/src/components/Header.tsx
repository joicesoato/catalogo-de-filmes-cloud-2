import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Toast from "./Toast";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível sair agora.");
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <NavLink className="wordmark" to="/catalog" aria-label="Frame, catálogo de Tom Hanks">
            <span className="wordmark-symbol">F</span><span>FRAME<small>FILM INDEX</small></span>
          </NavLink>
          <button className="menu-toggle" type="button" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span />
          </button>
          <nav className={`primary-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegação principal" onClick={() => setMenuOpen(false)}>
            <NavLink to="/catalog">Catálogo</NavLink>
            <NavLink to="/favorites">Favoritos</NavLink>
            {user?.role === "admin" && <NavLink to="/admin">Moderação</NavLink>}
            <div className="nav-account">
              <span className="user-greeting">{user?.nome}<small>{user?.role === "admin" ? "ADMINISTRADOR" : "MEMBRO"}</small></span>
              <button className="button button-quiet" type="button" onClick={signOut}>Sair</button>
            </div>
          </nav>
        </div>
      </header>
      <Toast message={error} tone="error" />
    </>
  );
}