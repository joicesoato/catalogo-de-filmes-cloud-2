# Catálogo de Filmes: Tom Hanks

Aplicação web desenvolvida para a disciplina **Introdução à Computação em Nuvem**, ministrada pelo professor **@siriani**.

O projeto utiliza a API do **TMDB** para consultar filmes de Tom Hanks e permite que usuários cadastrados façam login, favoritem filmes e adicionem comentários.

## Objetivo

Aplicar conceitos de computação em nuvem, consumo de APIs, persistência de dados, autenticação, isolamento de usuários e conteinerização com Docker.

A aplicação foi desenvolvida para garantir que os dados de cada usuário sejam separados dos demais usuários.

## Funcionalidades

- Cadastro de usuários
- Login e logout
- Consulta de filmes de Tom Hanks pela API do TMDB
- Exibição de título, pôster e sinopse
- Favoritar filmes
- Remover favoritos
- Adicionar comentários
- Persistência de favoritos e comentários no MariaDB/MySQL
- Isolamento dos dados entre diferentes usuários
- Execução em container Docker

## Tecnologias utilizadas

- Node.js
- Express
- MariaDB/MySQL
- TMDB API
- HTML
- CSS
- JavaScript
- Docker
- GitHub

## API do TMDB

Os filmes são obtidos diretamente da API do TMDB.

A aplicação:

1. Busca Tom Hanks na API;
2. Obtém seu `person_id`;
3. Consulta os créditos de filmes;
4. Utiliza os dados retornados para montar o catálogo.

Os dados de catálogo não são armazenados no banco de dados.

Os pôsteres são carregados diretamente utilizando as URLs fornecidas pela TMDB.

## Banco de dados

O banco possui três tabelas principais:

### `usuarios`

Armazena os usuários cadastrados na aplicação.

### `favoritos`

Armazena os filmes favoritados por cada usuário.

Cada favorito possui um `usuario_id`, garantindo que um usuário não acesse os favoritos de outro.

### `comentarios`

Armazena os comentários realizados pelos usuários.

Cada comentário também possui um `usuario_id`, garantindo a separação dos dados entre as contas.

## Isolamento de usuários

A aplicação utiliza o usuário autenticado para filtrar as informações armazenadas no banco.

Favoritos e comentários são vinculados ao usuário através do campo:

```text
usuario_id
```

Dessa forma:

```text
Usuário A
   ↓
usuario_id = A
   ↓
Seus favoritos e comentários
```

```text
Usuário B
   ↓
usuario_id = B
   ↓
Seus favoritos e comentários
```

Um usuário não deve visualizar os favoritos ou comentários pertencentes a outra conta.

## Variáveis de ambiente

As credenciais utilizadas pela aplicação não ficam diretamente no código.

As informações sensíveis são configuradas através de variáveis de ambiente.

Exemplo:

```env
TMDB_API_KEY=
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
SESSION_SECRET=
```

O arquivo `.env` contém os valores reais e **não deve ser publicado no GitHub**.

O arquivo `.env.example` contém apenas os nomes das variáveis necessárias.

## Como executar

### 1. Clonar o repositório

```bash
git clone URL_DO_REPOSITORIO
cd cadastro-cliente-cloud
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Configurar as variáveis de ambiente

Criar um arquivo `.env` com as variáveis necessárias:

```env
TMDB_API_KEY=
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
SESSION_SECRET=
```

### 4. Executar a aplicação

```bash
npm start
```

A aplicação será executada na porta:

```text
3000
```

## Docker

Para criar a imagem:

```bash
docker build -t joicesoato/catalogo-filmes:1.0 .
```

Para executar o container:

```bash
docker run -p 3000:3000 --env-file .env joicesoato/catalogo-filmes:1.0
```

## Deploy

A aplicação foi preparada para execução em ambiente Docker e posterior publicação através do **Portainer**.

O container utiliza a porta definida pela infraestrutura da disciplina para disponibilização da aplicação no subdomínio individual do aluno.

## Estrutura do projeto

```text
cadastro-cliente-cloud/
├── database/
│   └── schema.sql
├── middleware/
│   └── auth.js
├── public/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── services/
│   └── tmdb.js
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── init.sql
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

##  Autor

**Joice Soato**

Projeto acadêmico - 2026.2

**Disciplina:** Introdução à Computação em Nuvem

**Professor:** @siriani
