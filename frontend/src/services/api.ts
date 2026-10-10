import type {
  ApiMessage,
  Comment,
  Favorite,
  ModerationComment,
  Movie,
  Report,
  User,
} from "../types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const body: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail = typeof body === "object" && body !== null && "erro" in body
      ? String((body as ApiMessage).erro || "")
      : "";
    const fallback: Record<number, string> = {
      401: "Sua sessão expirou. Entre novamente.",
      403: "Você não tem permissão para esta ação.",
      500: "O servidor encontrou um problema. Tente novamente.",
      503: "Um serviço necessário está indisponível. Tente mais tarde.",
    };
    throw new ApiError(response.status, detail || fallback[response.status] || `A solicitação falhou (${response.status}).`);
  }

  return body as T;
}

const json = (value: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(value) });

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, json(body)),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export const endpoints = {
  session: () => api.get<{ logado: boolean; usuario?: User }>("/api/auth/me"),
  login: (email: string, senha: string) => api.post<{ usuario: User; mensagem: string }>("/api/auth/login", { email, senha }),
  logout: () => api.post<ApiMessage>("/api/auth/logout", {}),
  register: (nome: string, email: string, senha: string) => api.post<ApiMessage>("/api/auth/register", { nome, email, senha }),
  forgotPassword: (email: string) => api.post<ApiMessage>("/api/auth/forgot-password", { email }),
  resetPassword: (token: string, novaSenha: string) => api.post<ApiMessage>("/api/auth/reset-password", { token, novaSenha }),
  movies: () => api.get<{ filmes: Movie[] }>("/api/movies"),
  favorites: () => api.get<{ favoritos: Favorite[] }>("/api/favorites"),
  addFavorite: (movie: Movie) => api.post<ApiMessage>("/api/favorites", {
    tmdb_movie_id: movie.id,
    titulo: movie.titulo,
    poster_path: movie.poster_path,
  }),
  removeFavorite: (id: number) => api.delete<ApiMessage>(`/api/favorites/${id}`),
  comments: (movieId: number) => api.get<{ comentarios: Comment[] }>(`/api/comments/${movieId}`),
  commentCounts: (ids: number[]) => api.get<{ contagens: Record<string, number> }>(`/api/comments/counts?movieIds=${ids.join(",")}`),
  addComment: (movieId: number, texto: string) => api.post<ApiMessage>("/api/comments", { tmdb_movie_id: movieId, texto }),
  removeComment: (id: number) => api.delete<ApiMessage>(`/api/comments/${id}`),
  reportComment: (id: number, motivo: string) => api.post<ApiMessage>(`/api/comments/${id}/report`, { motivo }),
  reportCount: () => api.get<{ pendentes: number }>("/api/admin/reports/count"),
  moderationComments: (query: URLSearchParams) => api.get<{
    comentarios: ModerationComment[];
    pagina: number;
    limite: number;
    total: number;
    paginas: number;
  }>(`/api/admin/comments?${query}`),
  reports: () => api.get<{ denuncias: Report[] }>("/api/admin/reports"),
  updateReport: (id: number, status: "ignorada" | "resolvida") => api.patch<ApiMessage>(`/api/admin/reports/${id}`, { status }),
  auditLogs: (limit = 50) => api.get<{ logs: import("../types").AuditLog[] }>(`/api/admin/logs?limit=${limit}`),
  profile: (id: number) => api.get<{ perfil: import("../types").Profile; favoritos: Favorite[] }>(`/api/profile/${id}`),
  updateProfile: (id: number, body: { nome: string; bio: string }) => api.patch<ApiMessage>(`/api/profile/${id}`, body),
  premiumCheckout: () => api.post<{ url: string }>("/api/premium/checkout", {}),
  uploadProfileAvatar: (id: number, file: File) => {
    const form = new FormData();
    form.append("foto", file);
    return api.postForm<{ mensagem: string; avatar_url: string }>(`/api/profile/${id}/avatar`, form);
  },
};