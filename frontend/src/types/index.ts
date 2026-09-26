export type Role = "usuario" | "admin";

export interface User {
  id: number;
  nome: string;
  email: string;
  role: Role;
}

export interface Movie {
  id: number;
  titulo: string;
  sinopse: string;
  poster: string | null;
  poster_path: string | null;
  data_lancamento: string | null;
}

export interface Favorite {
  id: number;
  tmdb_movie_id: number;
  titulo: string;
  poster_path: string | null;
  criado_em: string;
}

export interface Comment {
  id: number;
  tmdb_movie_id: number;
  texto: string;
  criado_em: string;
  usuario_id: number;
  usuario_nome: string;
}

export interface ModerationComment extends Comment {
  titulo_filme: string;
  denuncias_pendentes: number;
  motivos: string[];
}

export interface Report {
  id: number;
  comentario_id: number;
  denunciante_id: number;
  motivo: string;
  criado_em: string;
  status: "pendente" | "resolvida" | "ignorada";
  analisado_em: string | null;
  analisado_por: number | null;
  texto: string;
  tmdb_movie_id: number;
  titulo_filme: string;
  denunciante_nome: string;
  autor_nome: string;
}

export interface ApiMessage {
  mensagem?: string;
  erro?: string;
}