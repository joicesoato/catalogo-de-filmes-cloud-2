import { Link } from "react-router-dom";
import type { Movie } from "../types";

export default function MovieCard({ movie, favorite, onFavorite }: {
  movie: Movie;
  favorite: boolean;
  onFavorite: (movie: Movie) => void;
}) {
  const year = movie.data_lancamento?.slice(0, 4);
  return (
    <article className="movie-card">
      <Link className="movie-art" to={`/movie/${movie.id}`} state={{ movie }} aria-label={`Ver detalhes de ${movie.titulo}`}>
        {movie.poster ? <img src={movie.poster} alt={`Pôster de ${movie.titulo}`} loading="lazy" /> : <span className="poster-fallback">FRAME</span>}
        <span className="art-overlay"><span>Explorar filme <b aria-hidden="true">↗</b></span></span>
      </Link>
      <div className="movie-card-info">
        <div className="movie-card-title"><h3><Link to={`/movie/${movie.id}`} state={{ movie }}>{movie.titulo}</Link></h3><span>{year || "—"}</span></div>
        <p>{movie.sinopse || "Sinopse não disponível."}</p>
        <button className={`favorite-control ${favorite ? "is-favorite" : ""}`} type="button" onClick={() => onFavorite(movie)} aria-pressed={favorite} aria-label={favorite ? `Remover ${movie.titulo} dos favoritos` : `Adicionar ${movie.titulo} aos favoritos`}>
          <span aria-hidden="true">{favorite ? "♥" : "＋"}</span>{favorite ? "Nos favoritos" : "Adicionar à lista"}
        </button>
      </div>
    </article>
  );
}