export function Skeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="movie-grid" aria-label="Carregando filmes" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton-poster shimmer" />
          <div className="skeleton-line shimmer" />
          <div className="skeleton-line short shimmer" />
        </div>
      ))}
    </div>
  );
}