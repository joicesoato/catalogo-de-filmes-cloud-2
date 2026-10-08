# Catálogo de Filmes — Tom Hanks

Projeto acadêmico desenvolvido para a disciplina **ISW055 — Introdução à Computação em Nuvem**, do curso de **Tecnologia em Sistemas Inteligentes da FATEC Pompeia**, semestre **2026.2**.

O projeto evoluiu durante as atividades da disciplina de uma aplicação inicial para uma aplicação web completa, conteinerizada e distribuída, incorporando autenticação, autorização baseada em papéis, auditoria, Redis, armazenamento de arquivos com MinIO, perfil de usuário, documentação OpenAPI e pipeline de CI/CD.

**Aluna:** Joice Soato Brito  
**Curso:** Tecnologia em Sistemas Inteligentes  
**Instituição:** FATEC Pompeia  
**Disciplina:** ISW055 — Introdução à Computação em Nuvem  
**Professor:** Prof. Allan Lincoln Rodrigues Siriani  
**Semestre:** 2026.2

---

# Relatório acadêmico

O relatório bimestral contendo o registro das atividades, datas, evidências, dificuldades e resultados está disponível no arquivo abaixo:

[Relatório P1 — ISW055 — Joice Soato Brito](./P1_ISW055_Joice_Soato_Brito.pdf)

---

# Repositórios

A primeira etapa do projeto foi desenvolvida no repositório inicial:

[catálogo-de-filmes-cloud](https://github.com/joicesoato/catalogo-de-filmes-cloud)

As atividades seguintes foram desenvolvidas e evoluídas no repositório principal:

[catalogo-de-filmes-cloud-2](https://github.com/joicesoato/catalogo-de-filmes-cloud-2)

A divisão dos repositórios corresponde à evolução do projeto durante as atividades da disciplina.

---

# 1. Visão geral

A aplicação permite consultar filmes de **Tom Hanks** e possui recursos relacionados a usuários, catálogo, interação e administração.

Entre os principais recursos implementados estão:

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

O desenvolvimento ocorreu de forma incremental, acompanhando as atividades propostas na disciplina.

## Atividade 1 — Aplicação e conteinerização

A primeira etapa foi desenvolvida no repositório `catalogo-de-filmes-cloud`.

O objetivo foi trabalhar a estrutura inicial da aplicação e sua execução em ambiente conteinerizado.

Foram utilizados:

- Node.js;
- Express;
- MariaDB;
- Docker;
- Docker Compose.

A aplicação passou a ser executada dentro de containers, permitindo maior padronização do ambiente e preparando a estrutura para as etapas seguintes.

---

# 3. Atividade 2 — Catálogo de filmes

Nesta etapa foi desenvolvido o catálogo de filmes de Tom Hanks utilizando a API do **TMDB**.

Principais recursos:

- consulta de filmes;
- exibição de título;
- poster;
- descrição;
- informações do filme;
- favoritos;
- comentários;
- persistência dos dados no MariaDB.

A integração com o TMDB é realizada pelo backend.

A chave da API não fica exposta diretamente no frontend.

A aplicação também passou a trabalhar com usuários e associação dos dados de favoritos e comentários aos respectivos usuários.

---

# 4. Atividade 3 — Autenticação

A aplicação passou a possuir um microsserviço dedicado para autenticação.

## Auth Service

O `auth-service` é responsável por funcionalidades relacionadas à autenticação e ao gerenciamento dos usuários.

Entre suas responsabilidades estão:

- cadastro;
- login;
- confirmação de e-mail;
- recuperação de senha;
- redefinição de senha;
- emissão e validação de JWT;
- gerenciamento de permissões;
- informações relacionadas ao papel do usuário.

O serviço utiliza a porta interna:

```text
3001
