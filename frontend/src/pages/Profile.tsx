import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { endpoints } from "../services/api";
import Toast from "../components/Toast";
import Loading from "../components/Loading";
import type { Favorite, Profile as ProfileType } from "../types";

export default function Profile() {
  const { id } = useParams();
  const { user, refreshSession } = useAuth();
  const profileId = Number(id);
  const isOwner = user?.id === profileId;
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [nome, setNome] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const result = await endpoints.profile(profileId);
      setProfile(result.perfil);
      setFavorites(result.favoritos);
      setNome(result.perfil.nome);
      setBio(result.perfil.bio || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar o perfil.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (Number.isInteger(profileId) && profileId > 0) void load();
  }, [profileId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    try {
      await endpoints.updateProfile(profileId, { nome, bio });
      await refreshSession();
      await load();
      setMessage("Perfil atualizado com sucesso.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar o perfil.");
    } finally { setSaving(false); }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true); setMessage(""); setError("");
    try {
      const result = await endpoints.uploadProfileAvatar(profileId, file);
      setProfile((current) => current ? { ...current, avatar_url: result.avatar_url } : current);
      setMessage("Foto de perfil atualizada.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar a foto.");
    } finally { setUploading(false); }
  }

  if (loading) return <Loading label="Carregando perfil" />;
  if (error && !profile) return <section className="content-page"><div className="error-panel"><p>{error}</p><button className="button button-secondary" type="button" onClick={() => void load()}>Tentar novamente</button></div></section>;
  if (!profile) return null;

  return (
    <section className="content-page profile-page">
      <div className="page-title-row">
        <div><span className="eyebrow">PERFIL</span><h1>{isOwner ? "Meu perfil" : profile.nome}</h1><p>Seu espaço no catálogo de filmes.</p></div>
      </div>
      <Toast message={error || message} tone={error ? "error" : "success"} />

      <div className="profile-layout">
        <article className="profile-card">
          <div className="profile-avatar-wrap">
            {profile.avatar_url ? <img className="profile-avatar" src={profile.avatar_url} alt={`Foto de ${profile.nome}`} /> : <div className="profile-avatar profile-avatar-fallback" aria-hidden="true">{profile.nome.slice(0, 1).toUpperCase()}</div>}
            {isOwner && <label className="button button-secondary profile-upload">{uploading ? "Enviando..." : "Trocar foto"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} disabled={uploading} /></label>}
          </div>
          <div className="profile-main">
            <span className="eyebrow">{profile.role === "admin" ? "ADMINISTRADOR" : "MEMBRO"}</span>
            <h2>{profile.nome}</h2>
            {profile.email && <p className="profile-email">{profile.email}</p>}
            <p className="profile-bio">{profile.bio || "Ainda não há uma bio cadastrada."}</p>
          </div>
        </article>

        {isOwner && <form className="profile-editor" onSubmit={save}>
          <div><span className="eyebrow">EDITAR PERFIL</span><h2>Sobre você</h2></div>
          <label className="field">Nome<input value={nome} onChange={(event) => setNome(event.target.value)} maxLength={100} required /></label>
          <label className="field">Bio<small>{bio.length}/280 caracteres</small><textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} placeholder="Conte um pouco sobre você..." /></label>
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button>
        </form>}
      </div>

      <section className="profile-favorites">
        <div className="section-heading"><div><span className="eyebrow">COLEÇÃO</span><h2>Filmes favoritos</h2><p>{favorites.length} {favorites.length === 1 ? "título salvo" : "títulos salvos"}</p></div></div>
        {favorites.length ? <div className="profile-favorite-grid">{favorites.map((favorite) => <Link className="profile-favorite" to={`/movie/${favorite.tmdb_movie_id}`} key={favorite.id}>{favorite.poster_path ? <img src={`https://image.tmdb.org/t/p/w300${favorite.poster_path}`} alt={`Pôster de ${favorite.titulo}`} loading="lazy" /> : <span>FRAME</span>}<strong>{favorite.titulo}</strong></Link>)}</div> : <p className="profile-empty">Nenhum filme favoritado ainda.</p>}
      </section>
    </section>
  );
}
