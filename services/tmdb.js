async function buscarTomHanks() {
  const token = process.env.TMDB_API_KEY;

  if (!token) {
    throw new Error("TMDB_API_KEY não configurada.");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    accept: "application/json"
  };

  const pessoaResponse = await fetch(
    "https://api.themoviedb.org/3/search/person?query=Tom%20Hanks&language=pt-BR",
    { headers }
  );

  if (!pessoaResponse.ok) {
    throw new Error(`Erro TMDB: ${pessoaResponse.status}`);
  }

  const pessoaData = await pessoaResponse.json();

  const pessoa = pessoaData.results?.find(
    item => item.name?.toLowerCase() === "tom hanks"
  );

  if (!pessoa) {
    throw new Error("Tom Hanks não encontrado.");
  }

  const filmesResponse = await fetch(
    `https://api.themoviedb.org/3/person/${pessoa.id}/movie_credits?language=pt-BR`,
    { headers }
  );

  if (!filmesResponse.ok) {
    throw new Error(`Erro ao buscar filmes: ${filmesResponse.status}`);
  }

  const filmesData = await filmesResponse.json();

  return (filmesData.cast || [])
    .filter(filme => filme.id && filme.title)
    .sort((a, b) =>
      (b.release_date || "").localeCompare(a.release_date || "")
    )
    .map(filme => ({
      id: filme.id,
      titulo: filme.title,
      sinopse: filme.overview || "Sinopse não disponível.",
      poster: filme.poster_path
        ? `https://image.tmdb.org/t/p/w500${filme.poster_path}`
        : null,
      poster_path: filme.poster_path,
      data_lancamento: filme.release_date || null
    }));
}

module.exports = { buscarTomHanks };
