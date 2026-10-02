import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import MovieCard from "../components/MovieCard";
import { Skeleton } from "../components/Skeleton";
import Toast from "../components/Toast";
import { endpoints } from "../services/api";
import type { Favorite, Movie } from "../types";

export default function Catalog() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [movieResult, favoriteResult] = await Promise.all([endpoints.movies(), endpoints.favorites()]);
      setMovies(movieResult.filmes); setFavorites(favoriteResult.favoritos);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar o catálogo.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function toggleFavorite(movie: Movie) {
    setNotice("");
    const existing = favorites.find((item) => Number(item.tmdb_movie_id) === Number(movie.id));
    try {
      if (existing) {
        await endpoints.removeFavorite(existing.id);
        setFavorites((items) => items.filter((item) => item.id !== existing.id));
        setNotice("Removido dos favoritos.");
      } else {
        await endpoints.addFavorite(movie);
        const result = await endpoints.favorites();
        setFavorites(result.favoritos); setNotice("Adicionado aos favoritos.");
      }
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Não foi possível atualizar os favoritos."); }
  }

  const visibleMovies = movies.filter((movie) => movie.titulo.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  const featured =
  movies.find((movie) => movie.titulo.toLowerCase() === "forrest gump") ??
  movies.find((movie) => Boolean(movie.poster)) ??
  movies[0];

  return (
    <div className="catalog-page">
      {featured && <section className="catalog-feature">
        {featured.poster && <img className="feature-backdrop" src={featured.poster} alt="" />}
        <div className="feature-scrim" />
        <div className="feature-copy"><span className="eyebrow">FILMOGRAFIA / TOM HANKS</span><p className="feature-kicker">UMA COLEÇÃO DE HISTÓRIAS</p><h1>{featured.titulo}</h1><p className="feature-description">{featured.sinopse || "Explore a trajetória de Tom Hanks através de seus filmes."}</p><div className="feature-actions"><Link className="button button-primary" to={`/movie/${featured.id}`} state={{ movie: featured }}>Ver filme <span aria-hidden="true">↗</span></Link><button className="button button-glass" type="button" onClick={() => toggleFavorite(featured)}>{favorites.some((item) => Number(item.tmdb_movie_id) === featured.id) ? "♥ Na sua lista" : "+ Minha lista"}</button></div></div>
        <span className="feature-index">01 <i /> FILM INDEX</span>
      </section>}

      <section className="catalog-section">
        <div className="section-heading"><div><span className="eyebrow">A OBRA</span><h2>Filmes de Tom Hanks</h2><p>{loading ? "" : `${visibleMovies.length} títulos no catálogo`}</p></div><label className="search-field"><span className="search-icon" aria-hidden="true">⌕</span><span className="visually-hidden">Buscar filmes</span><input type="search" placeholder="Buscar título..." value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
        <Toast message={notice} tone={notice.includes("Não foi") ? "error" : "success"} />
        {loading ? <Skeleton /> : error ? <div className="error-panel"><span className="eyebrow">CATÁLOGO INDISPONÍVEL</span><p>{error}</p><button className="button button-secondary" type="button" onClick={() => void load()}>Tentar novamente</button></div> : visibleMovies.length ? <div className="movie-grid">{visibleMovies.map((movie) => <MovieCard key={movie.id} movie={movie} favorite={favorites.some((item) => Number(item.tmdb_movie_id) === movie.id)} onFavorite={toggleFavorite} />)}</div> : <EmptyState title="Nenhum título encontrado" description={query ? "Experimente outro termo de busca." : "O catálogo não possui filmes no momento."} />}
      </section>
    </div>
  );
}