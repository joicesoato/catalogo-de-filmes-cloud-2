# Catálogo de Filmes — Tom Hanks

Projeto acadêmico da disciplina **ISW055 — Cloud**, desenvolvido com Node.js, Express, React, TypeScript, MariaDB, Docker, Docker Compose e Redis.

O sistema permite consultar filmes de Tom Hanks, criar conta, confirmar e-mail, fazer login, recuperar senha, favoritar filmes, comentar e denunciar comentários. A aplicação também possui **RBAC**, auditoria com **Redis Streams**, health checks, métricas e pipeline de **CI/CD com GitHub Actions**.

Professor: [Allan Siriani](https://github.com/siriani)

---

## 1. Arquitetura

```text
                           Navegador
                               │
                               ▼
                    ┌─────────────────────┐
                    │        app          │
                    │ React + Express     │
                    │       :3000         │
                    └──────┬───────┬──────┘
                           │       │
              ┌────────────┘       └─────────────┐
              ▼                                  ▼
     ┌─────────────────┐                 ┌─────────────────┐
     │  auth-service   │                 │   log-service   │
     │      :3001      │                 │      :3002      │
     │ rede interna    │                 │ rede interna    │
     └────────┬────────┘                 └────────┬────────┘
              │                                   │
              ▼                                   ▼
       ┌─────────────┐                      ┌─────────────┐
       │   MariaDB   │                      │    Redis    │
       │    :3306    │                      │    :6379    │
       └─────────────┘                      └─────────────┘
```

Somente o `app` publica porta para o host. `auth-service`, `log-service`, MariaDB e Redis permanecem na rede interna do Docker.

### Serviços

| Serviço | Responsabilidade | Porta pública |
|---|---|---:|
| `app` | Frontend React + API Express | `3000` |
| `auth-service` | Autenticação, JWT, bcrypt, e-mail e permissões | nenhuma |
| `log-service` | Auditoria e consulta de logs | nenhuma |
| `db` | Persistência MariaDB | nenhuma |
| `redis` | Redis Streams e persistência dos eventos | nenhuma |

---

## 2. Frontend React

O frontend foi migrado para **React + TypeScript + Vite**, mantendo a API e a autoridade de segurança no backend.

Principais páginas:

- Login;
- Cadastro;
- Recuperação de senha;
- Redefinição de senha;
- Catálogo;
- Detalhes do filme;
- Favoritos;
- Moderação administrativa;
- Visualização de eventos de auditoria.

A aplicação usa a sessão HTTP existente. O JWT continua somente entre o backend e o `auth-service`; ele não é armazenado no navegador.

Durante o build Docker, o Vite gera `frontend/dist` e o Express serve essa versão em produção.

---

## 3. Autenticação e segurança

### Senhas

As senhas nunca são armazenadas em texto puro. O `auth-service` utiliza `bcryptjs` com fator de custo 12.

### JWT

O JWT é emitido pelo `auth-service` e utilizado na comunicação interna entre o backend e o serviço de autenticação.

### Sessão

O navegador recebe apenas o cookie de sessão `connect.sid`, configurado com:

- `HttpOnly`;
- `SameSite=Lax`;
- `Secure` em produção;
- validade limitada.

### Recuperação de senha

Os tokens de recuperação são:

- aleatórios;
- armazenados com SHA-256;
- válidos por 30 minutos;
- de uso único.

### Proteções adicionais

- Helmet;
- Content Security Policy;
- rate limiting;
- consultas SQL parametrizadas;
- validação de entradas;
- limite de tamanho de body;
- segredo interno entre serviços;
- segredos fora do Git;
- comunicação interna entre containers;
- princípio de menor exposição de portas.

---

## 4. RBAC — Atividade 4

O sistema possui dois papéis:

- `usuario`;
- `admin`.

A autorização é aplicada no **backend**. A interface não é considerada uma barreira de segurança.

### `usuario`

- consulta o catálogo;
- gerencia os próprios favoritos;
- cria comentários;
- exclui somente os próprios comentários;
- denuncia comentários de terceiros;
- gerencia a própria conta.

### `admin`

Possui as permissões de usuário e também pode:

- excluir comentários de qualquer usuário;
- acessar a área de moderação;
- consultar denúncias;
- atualizar o status das denúncias;
- consultar os logs de auditoria.

### Enforcement

Antes de operações administrativas, o `app` consulta o `auth-service` em `/authorize`.

O `auth-service` verifica o JWT, consulta o papel atual no banco e retorna as permissões correspondentes.

Assim, uma alteração de papel no banco é considerada na próxima consulta de autorização, sem depender de uma permissão armazenada apenas na interface.

### Demonstração recomendada

1. Entrar como `usuario`.
2. Criar um comentário.
3. Excluir o próprio comentário: `200`.
4. Tentar excluir comentário de outro usuário: `403`.
5. Entrar como `admin`.
6. Excluir o comentário de outro usuário: sucesso.
7. Acessar `/api/admin/comments` como usuário comum: `403`.
8. Acessar `/api/admin/logs` como usuário comum: `403`.
9. Consultar `/api/admin/logs` como admin: `200`.

---

## 5. Auditoria com Redis — Atividade 5

Foi criado um serviço separado chamado `log-service`.

O serviço não possui porta publicada para o host e se comunica somente pela rede interna Docker.

### Redis Streams

Os eventos são armazenados no stream:

```text
audit:events
```

O Redis utiliza AOF para persistência:

```text
--appendonly yes
--appendfsync everysec
```

Os eventos são limitados a aproximadamente 5.000 registros para evitar crescimento ilimitado.

### Eventos registrados

A aplicação registra, entre outros:

| Evento | Quando ocorre |
|---|---|
| `login` | login realizado com sucesso |
| `logout` | logout realizado |
| `favorite_add` | filme adicionado aos favoritos |
| `favorite_remove` | filme removido dos favoritos |
| `comment_create` | comentário criado |
| `comment_delete` | comentário excluído |
| `access_denied_403` | tentativa autenticada sem permissão |

Cada evento possui, no mínimo:

- `usuario_id`;
- `acao`;
- `timestamp`.

Também podem ser registrados IP e detalhes da operação.

### Endpoint administrativo

```text
GET /api/admin/logs?limit=50
```

A rota é protegida por:

```text
admin:moderate
```

Usuário comum recebe `403 Forbidden`.

O frontend administrativo exibe os eventos recentes em uma área de auditoria.

---

## 6. Health checks e métricas — Extra 2

### `/health`

O endpoint do `app` verifica:

- MariaDB;
- `auth-service`;
- `log-service`.

Se todas as dependências estiverem disponíveis:

```text
HTTP 200
```

Se uma dependência estiver indisponível:

```text
HTTP 503
```

Exemplo:

```json
{
  "status": "ok",
  "servico": "catalogo",
  "dependencias": {
    "database": "ok",
    "auth_service": "ok",
    "log_service": "ok"
  }
}
```

Também existem health checks nos containers `app`, `auth-service`, `log-service`, `redis` e `db`.

### `/metrics`

A aplicação expõe métricas em formato compatível com Prometheus, incluindo:

- quantidade de requisições;
- método HTTP;
- rota;
- status HTTP;
- soma das durações das requisições.

Exemplo:

```text
GET /metrics
```

---

## 7. CI/CD — Extra 1

O workflow está em:

```text
.github/workflows/ci-cd.yml
```

A cada push na `main`:

1. instala e valida o frontend;
2. gera o build React;
3. constrói os containers;
4. sobe o ambiente completo;
5. verifica o `/health` real;
6. verifica `/metrics`;
7. verifica o `auth-service`;
8. verifica o `log-service`;
9. publica as imagens no Docker Hub.

As imagens recebem duas tags:

```text
<imagem>:<SHA-do-commit>
<imagem>:latest
```

Imagens:

```text
joicesoato/catalogo-filmes-tom-hanks
joicesoato/catalogo-filmes-tom-hanks-auth
joicesoato/catalogo-filmes-tom-hanks-log
```

### Secrets do GitHub

Configurar em **Settings → Secrets and variables → Actions**:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
PORTAINER_WEBHOOK   (opcional)
```

Nenhuma senha de banco, JWT, TMDB ou SMTP deve ser colocada no workflow.

### Deploy automático

Se o `PORTAINER_WEBHOOK` estiver configurado, o workflow chama o webhook após a publicação das imagens.

---

## 8. Execução local

Crie `.env` a partir de `.env.example` e preencha os valores reais.

Depois:

```bash
docker compose up -d --build
```

Verifique:

```bash
docker compose ps
```

Health:

```bash
curl http://localhost:3000/health
```

Métricas:

```bash
curl http://localhost:3000/metrics
```

A aplicação fica em:

```text
http://localhost:3000
```

---

## 9. Testes da auditoria

Depois de fazer login, favoritar, comentar e realizar uma tentativa negada de autorização, um administrador pode consultar:

```bash
curl -H "Cookie: connect.sid=SESSAO_DO_ADMIN" \
  http://localhost:3000/api/admin/logs?limit=20
```

Ou utilizar a área de auditoria do painel administrativo.

Para testar diretamente o Redis dentro do container:

```bash
docker compose exec redis redis-cli XREVRANGE audit:events + - COUNT 10
```

---

## 10. Portainer

Para publicação utilizando a infraestrutura externa existente, foi incluído:

```text
docker-compose.portainer.yml
```

Essa composição **não cria outro MariaDB**. Ela utiliza o banco externo já existente e adiciona o Redis persistente para a auditoria.

A aplicação continua publicada em:

```text
8211:3000
```

O `auth-service`, `log-service`, Redis e banco continuam sem portas públicas.

O valor de `IMAGE_TAG` pode ser configurado com o SHA do commit para demonstrar exatamente qual versão está em execução.

---

## 11. Banco de dados

As tabelas principais são:

- `usuarios`;
- `favoritos`;
- `comentarios`;
- `reset_tokens`;
- `comentario_denuncias`.

`init.sql` é utilizado na criação de um banco novo. Em uma instalação existente, devem ser aplicadas as migrations correspondentes sem destruir o volume.

**Não utilizar `docker compose down -v` em um ambiente com dados que precisam ser preservados.**

---

## 12. Estrutura principal

```text
catalogo-de-filmes-cloud-2/
├── .github/workflows/ci-cd.yml
├── auth-service/
├── database/
├── frontend/
│   └── src/
├── log-service/
├── middleware/
├── public/
├── services/
├── Dockerfile
├── docker-compose.yml
├── docker-compose.portainer.yml
├── init.sql
├── server.js
└── README.md
```

O diretório `public/` antigo foi preservado como referência/compatibilidade, enquanto a aplicação de produção utiliza o build React em `frontend/dist`.

---

## 13. Entrega e evidências

Para a apresentação/entrega, recomenda-se anexar prints de:

1. GitHub Actions com workflow verde;
2. containers `app`, `auth-service`, `log-service`, `redis` e `db` saudáveis;
3. `/health` retornando `200`;
4. `/health` retornando `503` durante uma simulação controlada de dependência indisponível, se solicitado;
5. `/metrics` com contadores;
6. usuário comum recebendo `403` em ação administrativa;
7. administrador acessando a moderação;
8. painel de auditoria mostrando eventos;
9. Portainer mostrando as imagens/versões implantadas.

---

## Observação de segurança

Arquivos `.env`, tokens, senhas, chaves JWT, credenciais SMTP e chaves da TMDB não devem ser commitados. Caso uma credencial real tenha sido exposta durante testes, ela deve ser rotacionada antes da entrega final.
