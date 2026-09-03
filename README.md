# Catálogo de Filmes — Tom Hanks

Aplicação web desenvolvida como projeto acadêmico para consulta e interação com filmes do ator **Tom Hanks**, utilizando a API do **TMDB** e uma arquitetura baseada em serviços desacoplados.

O projeto foi evoluído para separar as responsabilidades de autenticação da aplicação principal, utilizando um **microsserviço de autenticação** executado em um container Docker independente.

---

## Sobre o projeto

O sistema permite:

- Consultar filmes de Tom Hanks;
- Criar uma conta de usuário;
- Realizar login;
- Recuperar e redefinir a senha;
- Confirmar o e-mail de cadastro;
- Trabalhar com diferentes papéis de usuário;
- Adicionar filmes aos favoritos;
- Adicionar comentários aos filmes;
- Manter os dados associados ao usuário autenticado;
- Executar a aplicação utilizando Docker e Docker Compose.

---

## Arquitetura

O projeto utiliza três containers principais:

```text
                    ┌──────────────────────┐
                    │      Navegador       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │        app           │
                    │  Catálogo de Filmes  │
                    │      porta 3000       │
                    └──────────┬───────────┘
                               │
                    Rede Docker interna
                               │
                               ▼
                    ┌──────────────────────┐
                    │    auth-service      │
                    │ Microsserviço de     │
                    │   autenticação       │
                    │      porta 3001      │
                    │   sem porta pública  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │         db           │
                    │     MariaDB/MySQL    │
                    │      porta 3306      │
                    └──────────────────────┘
```

### Serviços

| Serviço | Função | Porta |
|---|---|---|
| `app` | Aplicação principal e catálogo | `3000` pública |
| `auth-service` | Cadastro, login, papéis e recuperação de senha | `3001` somente interna |
| `db` | Banco de dados MariaDB/MySQL | `3306` interna |

O `auth-service` **não possui mapeamento de porta para o host**. Ele é acessado pela aplicação principal através da rede interna do Docker.

---

## Microsserviço de autenticação

A autenticação foi desacoplada da aplicação principal.

O `auth-service` é responsável por:

- Cadastro de usuários;
- Hash das senhas;
- Login;
- Geração de JWT;
- Validação do token;
- Controle de papéis;
- Confirmação de e-mail;
- Solicitação de recuperação de senha;
- Geração de token de recuperação;
- Validação de token;
- Expiração do token;
- Uso único do token;
- Alteração da senha.

A aplicação principal funciona como gateway para as rotas públicas de autenticação, encaminhando as requisições para o serviço interno.

---

## Papéis de usuário

O sistema possui dois papéis:

- `usuario`
- `admin`

O papel do usuário é armazenado no banco de dados e também é incluído nas informações do usuário autenticado.

---

## Segurança das senhas

As senhas **não são armazenadas em texto puro**.

O projeto utiliza a biblioteca **bcryptjs** para gerar um hash seguro da senha antes de armazená-la no banco de dados.

Exemplo do fluxo:

```text
Senha informada
      ↓
bcrypt
      ↓
senha_hash
      ↓
Banco de dados
```

No login, a senha informada é comparada com o hash armazenado utilizando `bcrypt.compare()`.

---

## Confirmação de e-mail

Após o cadastro, o sistema gera um token de confirmação e envia um link para o e-mail informado.

O token possui validade de **30 minutos**.

O usuário somente consegue realizar o login após a confirmação do e-mail.

Fluxo:

```text
Cadastro
   ↓
Geração do token
   ↓
Envio do e-mail
   ↓
Usuário acessa o link
   ↓
Token é validado
   ↓
E-mail confirmado
   ↓
Login liberado
```

---

## Recuperação de senha

O sistema possui fluxo de recuperação de senha por e-mail.

Ao solicitar a recuperação:

1. O usuário informa o e-mail;
2. O `auth-service` gera um token aleatório;
3. O token é armazenado na tabela `reset_tokens`;
4. É definida uma validade de 30 minutos;
5. Um link de redefinição é enviado por e-mail;
6. O usuário acessa o link;
7. O token é validado;
8. A nova senha é armazenada utilizando bcrypt;
9. O token é marcado como utilizado.

### Regras do token

O token somente é aceito quando:

- Existe no banco;
- Ainda não expirou;
- Não foi utilizado anteriormente.

Após a redefinição, o token é marcado como:

```text
usado = TRUE
```

Assim, ele não pode ser reutilizado.

---

## Banco de dados

O projeto utiliza **MariaDB/MySQL**.

Entre as principais estruturas estão:

- `usuarios`
- `favoritos`
- `comentarios`
- `reset_tokens`

A tabela `reset_tokens` é utilizada especificamente para o fluxo de recuperação de senha.

Estrutura conceitual:

```text
reset_tokens
├── id
├── token
├── usuario_id
├── criado_em
├── expira_em
└── usado
```

---

## API do TMDB

Os filmes são obtidos através da API do **The Movie Database (TMDB)**.

O token da API é armazenado em variável de ambiente e não deve ser versionado no GitHub.

A aplicação utiliza o serviço:

```text
services/tmdb.js
```

para realizar a comunicação com a API.

---

## Docker

O projeto utiliza **Docker Compose** para executar todos os serviços.

Para iniciar:

```bash
docker compose up -d --build
```

Para verificar os containers:

```bash
docker compose ps
```

Para acompanhar os logs:

```bash
docker compose logs -f
```

Para parar os serviços:

```bash
docker compose down
```

---

## Acesso à aplicação

Após iniciar os containers, a aplicação principal estará disponível em:

```text
http://localhost:3000
```

O `auth-service` não deve ser acessado diretamente pelo navegador, pois sua porta não é publicada no host.

A comunicação ocorre internamente:

```text
app → auth-service:3001
```

---

## Estrutura do projeto

```text
catalogo-de-filmes/
│
├── auth-service/
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
│
├── database/
│   └── schema.sql
│
├── middleware/
│   └── auth.js
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── services/
│   └── tmdb.js
│
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

---

## Variáveis de ambiente

Crie um arquivo `.env` local com as configurações necessárias.

Exemplo:

```env
PORT=3000

DB_HOST=db
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=seu_banco

TMDB_TOKEN=seu_token_tmdb

AUTH_SERVICE_URL=http://auth-service:3001
AUTH_PORT=3001

JWT_SECRET=sua_chave_jwt
SESSION_SECRET=sua_chave_de_sessao

APP_URL=http://localhost:3000

MAIL_HOST=seu_servidor_smtp
MAIL_PORT=587
MAIL_USER=seu_usuario_smtp
MAIL_PASSWORD=sua_senha_smtp
MAIL_FROM=seu_email
```

⚠️ **Nunca envie o arquivo `.env` para o GitHub.**

O projeto deve utilizar `.env.example` para documentar as variáveis necessárias sem expor credenciais.

---

## Instalação e execução

### 1. Clonar o repositório

```bash
git clone URL_DO_REPOSITORIO
cd catalogo-de-filmes
```

### 2. Configurar o `.env`

Crie o arquivo:

```bash
.env
```

e preencha as variáveis necessárias.

### 3. Subir os containers

```bash
docker compose up -d --build
```

### 4. Verificar

```bash
docker compose ps
```

Acesse:

```text
http://localhost:3000
```

---

## Testes básicos

### Verificar o catálogo

Acesse:

```text
http://localhost:3000
```

### Verificar o auth-service

O serviço possui uma rota interna:

```text
GET /health
```

Exemplo de teste dentro do Docker:

```bash
docker compose exec app node -e "fetch('http://auth-service:3001/health').then(async r=>console.log(r.status, await r.text())).catch(e=>console.error(e.message))"
```

Resposta esperada:

```json
{
  "status": "ok",
  "servico": "auth-service"
}
```

---

## Fluxo geral de autenticação

```text
                 USUÁRIO
                    │
                    ▼
             Aplicação Web
                    │
                    ▼
                 app:3000
                    │
                    │ rede Docker interna
                    ▼
             auth-service:3001
                    │
                    ▼
                 MariaDB
```

Para recuperação de senha:

```text
Usuário
   │
   ▼
"Esqueci minha senha"
   │
   ▼
app
   │
   ▼
auth-service
   │
   ├── gera token
   ├── salva token
   └── envia e-mail
          │
          ▼
       Usuário
          │
          ▼
   Link de recuperação
          │
          ▼
     valida token
          │
          ▼
     nova senha
```

---

## Tecnologias utilizadas

- **Node.js**
- **Express**
- **JavaScript**
- **MySQL2**
- **MariaDB/MySQL**
- **bcryptjs**
- **jsonwebtoken**
- **Nodemailer**
- **Docker**
- **Docker Compose**
- **HTML**
- **CSS**
- **JavaScript**
- **API TMDB**

---

## Atividade acadêmica

Projeto desenvolvido como continuação da atividade de serviços desacoplados, com foco na separação da autenticação em um microsserviço independente.

### Principais conceitos aplicados

- Arquitetura de microsserviços;
- Containers Docker;
- Comunicação entre serviços;
- Rede interna Docker;
- API REST;
- Autenticação;
- Autorização por papéis;
- JWT;
- Hash de senhas;
- Recuperação de senha;
- Tokens com expiração;
- Tokens de uso único;
- Integração com serviço SMTP;
- Persistência em banco de dados.

Professor responsável:

**Siriani**  
GitHub: `github.com/siriani`

---

## Observação sobre o envio de e-mails

A funcionalidade de envio de e-mails foi implementada utilizando **SMTP/Nodemailer**, com suporte a provedor externo.

Durante a etapa de entrega, o provedor SMTP utilizado apresentou uma restrição relacionada à ativação da conta SMTP, impedindo a validação prática do envio das mensagens.

A implementação do microsserviço contempla a geração, armazenamento, expiração e validação dos tokens de confirmação e recuperação de senha.

---

## Autoria

**Joice Soato**

Projeto acadêmico — Catálogo de Filmes com Microsserviço de Autenticação.
