# Catálogo de Filmes — Tom Hanks

Projeto acadêmico desenvolvido para a disciplina **ISW055 — Introdução à Computação em Nuvem (Cloud)**.

O projeto evoluiu durante as atividades da disciplina de uma aplicação simples de catálogo para uma aplicação web completa, conteinerizada e distribuída, com autenticação, autorização por papéis, auditoria, Redis, armazenamento de arquivos com MinIO, perfil de usuário, documentação OpenAPI e pipeline de CI/CD.

**Professor:** [Allan Siriani](https://github.com/siriani)

**Repositório:** https://github.com/joicesoato/catalogo-de-filmes-cloud-2

---

# 1. Visão geral

A aplicação permite consultar filmes de **Tom Hanks** e possui recursos de:

- cadastro de usuários;
- confirmação de e-mail;
- login e logout;
- recuperação e redefinição de senha;
- catálogo de filmes;
- detalhes dos filmes;
- favoritos;
- comentários;
- denúncias de comentários;
- moderação administrativa;
- controle de acesso baseado em papéis (RBAC);
- auditoria de ações;
- perfil de usuário;
- upload de foto de perfil;
- armazenamento de imagens no MinIO;
- Redis Streams;
- health checks;
- métricas;
- documentação Swagger/OpenAPI;
- CI/CD com GitHub Actions;
- execução com Docker e Docker Compose;
- implantação em Portainer.

---

# 2. Evolução do projeto

## Atividade 1 — Aplicação e conteinerização

A primeira etapa teve como objetivo disponibilizar a aplicação em um ambiente conteinerizado.

Foram utilizados:

- Node.js;
- Express;
- MariaDB;
- Docker;
- Docker Compose.

A aplicação passou a ser executada dentro de container, permitindo maior padronização entre ambientes.

---

# 3. Atividade 2 — Catálogo de filmes

Foi implementado o catálogo de filmes de Tom Hanks utilizando a API do **TMDB**.

Principais recursos:

- consulta de filmes;
- exibição de título;
- poster;
- descrição;
- informações do filme;
- favoritos;
- comentários;
- persistência dos dados no MariaDB.

A integração com o TMDB é realizada exclusivamente pelo backend.

A chave da API não fica exposta no frontend.

---

# 4. Atividade 3 — Autenticação

A aplicação passou a possuir um microserviço dedicado de autenticação.

## Auth Service

O `auth-service` é responsável por:

- cadastro;
- login;
- confirmação de e-mail;
- recuperação de senha;
- redefinição de senha;
- emissão e validação de JWT;
- gerenciamento de permissões.

O serviço utiliza a porta interna:

```text
3001
```

A porta não é publicada diretamente para a internet na composição de produção.

## Senhas

As senhas dos usuários não são armazenadas em texto puro.

O sistema utiliza:

```text
bcryptjs
```

com fator de custo 12.

## Recuperação de senha

Os tokens de recuperação:

- são gerados de forma aleatória;
- são armazenados utilizando SHA-256;
- possuem validade de 30 minutos;
- são de uso único.

---

# 5. Atividade 4 — Autorização e RBAC

Foi implementado controle de acesso baseado em papéis.

Existem dois papéis:

```text
usuario
admin
```

A autorização é aplicada no **backend**.

A interface não é considerada uma barreira de segurança.

## Usuário comum

Pode:

- consultar o catálogo;
- adicionar e remover os próprios favoritos;
- criar comentários;
- excluir os próprios comentários;
- denunciar comentários;
- editar o próprio perfil.

## Administrador

Além das permissões do usuário comum, pode:

- excluir comentários de outros usuários;
- consultar denúncias;
- atualizar denúncias;
- acessar recursos administrativos;
- consultar os registros de auditoria.

## Autorização centralizada

Antes de operações protegidas, o backend consulta o `auth-service`.

O serviço verifica:

1. identidade do usuário;
2. sessão/JWT;
3. papel atual;
4. permissão necessária.

Isso evita confiar somente em informações enviadas pelo frontend.

## Exemplo de controle

Uma tentativa de usuário comum acessar um endpoint administrativo resulta em:

```text
403 Forbidden
```

Da mesma forma, um usuário não pode excluir o comentário de outra pessoa.

---

# 6. Atividade 5 — Auditoria e Redis

Foi criado um serviço separado:

```text
log-service
```

Ele é responsável pelo registro e consulta dos eventos de auditoria.

A comunicação ocorre pela rede interna do Docker.

## Redis Streams

Os eventos são armazenados no stream:

```text
audit:events
```

O Redis utiliza persistência AOF:

```text
--appendonly yes
--appendfsync everysec
```

Os eventos são limitados para evitar crescimento ilimitado do stream.

## Eventos registrados

Entre os eventos registrados estão:

| Evento | Descrição |
|---|---|
| `login` | Login realizado |
| `logout` | Logout realizado |
| `favorite_add` | Filme adicionado aos favoritos |
| `favorite_remove` | Filme removido dos favoritos |
| `comment_create` | Comentário criado |
| `comment_delete` | Comentário excluído |
| `access_denied_403` | Tentativa de acesso sem permissão |
| `profile_update` | Perfil atualizado |
| `profile_avatar_upload` | Foto enviada ao MinIO |

Cada evento possui informações como:

- usuário;
- ação;
- data/hora;
- detalhes da operação.

Quando disponível, também podem ser registrados dados como IP.

## Consulta administrativa

Os administradores podem consultar:

```text
GET /api/admin/logs?limit=50
```

Usuários comuns não possuem permissão para acessar esse endpoint.

---

# 7. Atividade 6 — Upload e perfil

A sexta atividade transforma o catálogo em uma aplicação com características de rede social.

## Perfil

Cada usuário possui uma página de perfil com:

- nome;
- foto;
- bio;
- e-mail;
- papel;
- filmes favoritos.

A página utiliza a rota:

```text
/profile/:id
```

## Edição do perfil

A atualização utiliza:

```text
PATCH /api/profile/:id
```

A identidade utilizada pelo backend vem da sessão autenticada.

O backend **não confia em um `usuario_id` enviado pelo frontend para determinar quem está sendo editado**.

A tentativa de editar o perfil de outro usuário resulta em:

```text
403 Forbidden
```

Essa tentativa também pode gerar o evento:

```text
access_denied_403
```

---

# 8. Upload da foto de perfil

O upload é realizado através de:

```text
POST /api/profile/:id/avatar
```

Formato:

```text
multipart/form-data
```

Campo:

```text
foto
```

## Validações

O backend valida:

- tipo de arquivo;
- MIME type;
- assinatura/magic bytes;
- tamanho máximo.

São aceitos:

```text
JPEG
PNG
WEBP
GIF
```

O tamanho máximo é:

```text
5 MB
```

Arquivos que não atendem às validações são rejeitados antes do armazenamento.

---

# 9. MinIO

O armazenamento das fotos utiliza **MinIO**, compatível com a API S3.

O bucket utilizado é:

```text
profile-photos
```

As imagens são armazenadas com chaves semelhantes a:

```text
profiles/<usuario_id>/<uuid>.jpg
```

O arquivo binário não é armazenado no MariaDB.

No banco é armazenada somente a referência:

```text
avatar_object_key
```

Isso mantém o banco responsável pelos dados da aplicação e o armazenamento de objetos responsável pelos arquivos.

## Exibição da foto

A aplicação utiliza uma rota própria para entregar a imagem:

```text
GET /api/profile/:id/avatar
```

O backend localiza o `avatar_object_key` no MariaDB, recupera o objeto no MinIO e devolve a imagem ao navegador.

Dessa forma, o navegador não precisa conhecer as credenciais do MinIO.

Essa estratégia também permite manter o MinIO dentro da rede Docker e reduzir sua exposição externa.

---

# 10. Banco de dados

As principais tabelas utilizadas são:

```text
usuarios
favoritos
comentarios
reset_tokens
comentario_denuncias
```

Para a Atividade 6 foram adicionados à tabela `usuarios`:

```text
bio
avatar_object_key
```

A migration correspondente está em:

```text
database/migration-v5.sql
```

A migration foi criada para preservar os dados existentes.

Ela não remove usuários ou favoritos.

---

# 11. Arquitetura

```text
                         NAVEGADOR
                             │
                             ▼
                    ┌─────────────────┐
                    │      APP        │
                    │ React + Express │
                    │      :3000      │
                    └───────┬─────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
          ▼                 ▼                  ▼
 ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
 │  auth-service  │ │  log-service   │ │     MinIO      │
 │     :3001      │ │     :3002      │ │ armazenamento  │
 └───────┬────────┘ └───────┬────────┘ └────────────────┘
         │                  │
         ▼                  ▼
 ┌───────────────┐    ┌───────────────┐
 │    MariaDB    │    │     Redis     │
 │      :3306    │    │     :6379     │
 └───────────────┘    └───────────────┘
```

Os serviços internos não precisam ter suas portas publicadas para o host.

---

# 12. Serviços

| Serviço | Função |
|---|---|
| `app` | Frontend React + API Express |
| `auth-service` | Autenticação e autorização |
| `log-service` | Auditoria |
| `minio` | Armazenamento de fotos |
| `db` | MariaDB |
| `redis` | Redis Streams e persistência |

---

# 13. Frontend

O frontend utiliza:

- React;
- TypeScript;
- Vite.

Principais telas:

- Login;
- Cadastro;
- Confirmação de e-mail;
- Recuperação de senha;
- Redefinição de senha;
- Catálogo;
- Detalhes do filme;
- Favoritos;
- Perfil;
- Moderação;
- Auditoria administrativa.

Durante o build Docker, o Vite gera:

```text
frontend/dist
```

Essa versão é servida pelo Express em produção.

---

# 14. Segurança

Foram aplicadas diversas medidas de segurança.

## Proteções HTTP

Utilização de:

```text
Helmet
```

com políticas de segurança, incluindo Content Security Policy.

## Rate limiting

Existem limites de requisições para reduzir abuso de endpoints sensíveis.

## SQL

As consultas ao banco utilizam parâmetros, evitando concatenação direta de valores fornecidos pelo usuário.

## Sessão

O navegador utiliza cookie de sessão com configurações como:

```text
HttpOnly
SameSite=Lax
Secure em produção
```

O JWT não é armazenado diretamente no navegador.

## Segredos

Informações sensíveis ficam em variáveis de ambiente.

Não devem ser armazenados no Git:

- senhas;
- tokens;
- JWT secrets;
- credenciais SMTP;
- chave do TMDB;
- credenciais do MinIO.

---

# 15. Health Checks

A aplicação possui endpoint:

```text
GET /health
```

Ele verifica as dependências principais da aplicação.

Também existem health checks configurados nos containers.

Exemplo de resposta saudável:

```json
{
  "status": "ok",
  "servico": "catalogo"
}
```

Os health checks permitem que o Docker/Portainer identifique containers que não estão funcionando corretamente.

---

# 16. Métricas

A aplicação possui:

```text
GET /metrics
```

As métricas incluem informações relacionadas às requisições HTTP, como:

- método;
- rota;
- status;
- quantidade de requisições;
- duração das requisições.

O formato é compatível com ferramentas de monitoramento como Prometheus.

---

# 17. Swagger / OpenAPI — Atividade Extra

A documentação da API foi adicionada para facilitar a compreensão e os testes dos serviços.

## Aplicação principal

Swagger UI:

```text
/api/docs
```

OpenAPI:

```text
/api/openapi.json
```

Arquivo:

```text
docs/openapi-app.json
```

## Auth Service

Swagger UI:

```text
/docs
```

OpenAPI:

```text
/openapi.json
```

Arquivo:

```text
auth-service/openapi.json
```

A documentação contém endpoints, parâmetros, corpos de requisição e respostas HTTP.

Também é possível utilizar:

```text
Try it out
```

para realizar testes diretamente pelo Swagger UI.

O `auth-service` permanece sem porta pública na composição de produção.

---

# 18. CI/CD — Atividade Extra

O projeto possui pipeline de CI/CD utilizando:

```text
GitHub Actions
```

Workflow:

```text
.github/workflows/ci-cd.yml
```

A pipeline executa etapas como:

1. instalação das dependências;
2. validação do frontend;
3. build do React;
4. construção das imagens Docker;
5. inicialização do ambiente de testes;
6. verificação dos serviços;
7. verificação de health;
8. verificação de métricas;
9. publicação das imagens no Docker Hub.

As imagens publicadas são:

```text
joicesoato/catalogo-filmes-tom-hanks
joicesoato/catalogo-filmes-tom-hanks-auth
joicesoato/catalogo-filmes-tom-hanks-log
```

As imagens podem utilizar as tags:

```text
latest
<sha-do-commit>
```

---

# 19. Docker

O projeto possui Dockerfiles separados para os principais serviços.

A aplicação principal utiliza uma construção em múltiplas etapas:

```text
Frontend build
      ↓
frontend/dist
      ↓
Imagem Node.js
      ↓
Express servindo a aplicação
```

Isso evita a necessidade de executar o servidor de desenvolvimento do Vite em produção.

---

# 20. Docker Compose

Arquivo principal:

```text
docker-compose.yml
```

Ele permite executar o ambiente local com:

```bash
docker compose up -d --build
```

Para verificar:

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

Aplicação:

```text
http://localhost:3000
```

---

# 21. Portainer

Para implantação no ambiente disponibilizado pela disciplina foi criado:

```text
docker-compose.portainer.yml
```

A composição utiliza o banco externo existente e não cria outro banco MariaDB para produção.

A aplicação é publicada na porta:

```text
8211
```

Mapeamento:

```text
8211:3000
```

Os serviços internos permanecem protegidos pela rede Docker.

A rede utiliza a sub-rede:

```text
10.254.250.0/24
```

Isso evita depender exclusivamente dos pools automáticos de redes Docker do servidor.

O MinIO possui armazenamento persistente por volume:

```text
minio_data
```

---

# 22. Variáveis de ambiente

As variáveis necessárias estão documentadas em:

```text
.env.example
```

Principais variáveis:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD

JWT_SECRET
SESSION_SECRET
INTERNAL_SERVICE_SECRET

TMDB_API_KEY

MAIL_HOST
MAIL_PORT
MAIL_USER
MAIL_PASSWORD
MAIL_FROM

MINIO_ENDPOINT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
MINIO_BUCKET
MINIO_REGION
```

Os valores reais não devem ser commitados.

---

# 23. Estrutura do projeto

```text
catalogo-de-filmes-cloud-2/
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml
│
├── auth-service/
│   ├── index.js
│   ├── openapi.json
│   ├── Dockerfile
│   └── package.json
│
├── database/
│   ├── schema.sql
│   └── migration-v5.sql
│
├── docs/
│   └── openapi-app.json
│
├── frontend/
│   └── src/
│
├── log-service/
│
├── middleware/
│
├── services/
│   ├── audit.js
│   ├── minio.js
│   └── tmdb.js
│
├── Dockerfile
├── docker-compose.yml
├── docker-compose.portainer.yml
├── init.sql
├── server.js
├── package.json
├── .env.example
└── README.md
```

---

# 24. Evidências recomendadas para a entrega

Para demonstrar a implementação das atividades, podem ser apresentados:

## Atividades iniciais

- aplicação funcionando;
- containers em execução;
- catálogo de filmes;
- consulta ao TMDB.

## Autenticação

- cadastro;
- login;
- confirmação de e-mail;
- recuperação de senha.

## RBAC

- usuário comum recebendo `403` em ação administrativa;
- administrador acessando recurso administrativo;
- usuário tentando excluir comentário de outra pessoa.

## Auditoria

- eventos registrados no Redis;
- painel de auditoria;
- consulta de logs como administrador.

## Atividade 6

- página de perfil;
- foto carregada;
- bio;
- favoritos;
- upload de imagem;
- tentativa de editar outro perfil retornando `403`.

## Infraestrutura

- Docker;
- Docker Compose;
- Portainer;
- containers saudáveis;
- MinIO com bucket `profile-photos`.

## Extras

- GitHub Actions executado com sucesso;
- imagens publicadas no Docker Hub;
- Swagger UI da aplicação;
- Swagger UI do auth-service;
- `/health`;
- `/metrics`.

---

# 25. Segurança durante a entrega

Antes da publicação final, verificar se nenhum arquivo contém credenciais reais.

Não devem ser enviados ao GitHub:

```text
.env
```

ou arquivos contendo:

```text
DB_PASSWORD
JWT_SECRET
SESSION_SECRET
INTERNAL_SERVICE_SECRET
TMDB_API_KEY
MAIL_PASSWORD
MINIO_SECRET_KEY
```

O arquivo disponibilizado no repositório é:

```text
.env.example
```

com valores de exemplo.

---

# 26. Conclusão

O projeto evoluiu de um catálogo de filmes para uma aplicação web distribuída, com separação de responsabilidades entre serviços.

A solução utiliza:

```text
React
TypeScript
Vite
Node.js
Express
MariaDB
Redis
Redis Streams
MinIO
Docker
Docker Compose
Portainer
GitHub Actions
Swagger/OpenAPI
TMDB
```

As atividades implementadas abrangem:

- aplicação conteinerizada;
- catálogo de filmes;
- autenticação;
- recuperação de senha;
- autorização RBAC;
- auditoria;
- Redis Streams;
- health checks;
- métricas;
- upload de arquivos;
- perfil de usuário;
- armazenamento de objetos;
- CI/CD;
- documentação de API.

O projeto foi estruturado buscando manter os serviços separados, reduzir a exposição de portas, proteger credenciais e centralizar as regras de autenticação e autorização no backend.
