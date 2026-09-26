import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import Toast from "../components/Toast";
import { endpoints } from "../services/api";
import type { Favorite } from "../types";

export default function Favorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { const result = await endpoints.favorites(); setFavorites(result.favoritos); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar seus favoritos."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function remove(id: number) {
    setNotice("");
    try { await endpoints.removeFavorite(id); setFavorites((items) => items.filter((item) => item.id !== id)); setNotice("Filme removido da sua lista."); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Não foi possível remover o favorito."); }
  }

  return <section className="content-page"><div className="page-title-row"><div><span className="eyebrow">SUA COLEÇÃO</span><h1>Favoritos</h1><p>Os filmes que você guardou para depois.</p></div><span className="count-display">{favorites.length.toString().padStart(2, "0")} <small>TÍTULOS</small></span></div><Toast message={error || notice} tone={error || notice.includes("Não foi") ? "error" : "success"} />{loading ? <Skeleton count={4} /> : error ? <div className="error-panel"><p>{error}</p><button className="button button-secondary" type="button" onClick={() => void load()}>Tentar novamente</button></div> : favorites.length ? <div className="movie-grid">{favorites.map((favorite) => <article className="movie-card favorite-card" key={favorite.id}><Link className="movie-art" to={`/movie/${favorite.tmdb_movie_id}`}><img src={favorite.poster_path ? `https://image.tmdb.org/t/p/w500${favorite.poster_path}` : ""} alt={`Pôster de ${favorite.titulo}`} loading="lazy" />{!favorite.poster_path && <span className="poster-fallback">FRAME</span>}<span className="art-overlay"><span>Explorar filme <b aria-hidden="true">↗</b></span></span></Link><div className="movie-card-info"><div className="movie-card-title"><h3><Link to={`/movie/${favorite.tmdb_movie_id}`}>{favorite.titulo}</Link></h3></div><button className="favorite-control is-favorite" type="button" onClick={() => void remove(favorite.id)}><span aria-hidden="true">♥</span>Remover da lista</button></div></article>)}</div> : <EmptyState title="Sua lista começa aqui" description="Guarde os filmes que quer rever ou descobrir mais tarde." action={{ label: "Explorar catálogo", to: "/catalog" }} />}</section>;
}