# Catálogo de Filmes — Tom Hanks

Projeto acadêmico desenvolvido para a disciplina ISW055 — Introdução à Computação em Nuvem, do curso de Tecnologia em Sistemas Inteligentes da FATEC Pompeia, semestre 2026.2.

O projeto consiste no desenvolvimento e evolução de uma aplicação web de catálogo de filmes, com foco nas obras do ator Tom Hanks. Ao longo das atividades da disciplina, a aplicação foi evoluída progressivamente, incorporando recursos de autenticação, autorização baseada em papéis, auditoria, logs, armazenamento de arquivos, perfil de usuário, documentação de API, conteinerização e integração contínua.

Aluna: Joice Soato Brito
Curso: Tecnologia em Sistemas Inteligentes
Instituição: FATEC Pompeia
Disciplina: ISW055 — Introdução à Computação em Nuvem
Professor: Prof. Allan Lincoln Rodrigues Siriani
Semestre: 2026.2


## RELATÓRIO ACADÊMICO

O relatório bimestral contendo o registro das atividades, datas, evidências, dificuldades e resultados do projeto está disponível no arquivo:

[Relatório P1 — ISW055 — Joice Soato Brito](./P1_ISW055_Joice_Soato_Brito.pdf)


## REPOSITÓRIOS

A primeira etapa do projeto foi desenvolvida no repositório:

https://github.com/joicesoato/catalogo-de-filmes-cloud

As atividades seguintes foram desenvolvidas e evoluídas no repositório:

https://github.com/joicesoato/catalogo-de-filmes-cloud-2

A divisão dos repositórios corresponde à evolução do projeto durante as atividades propostas na disciplina.


## 1. VISÃO GERAL

A aplicação permite consultar filmes de Tom Hanks e possui recursos relacionados a usuários, catálogo, interação e administração.

Entre os principais recursos implementados estão:

- Cadastro de usuários
- Confirmação de e-mail
- Login e logout
- Recuperação e redefinição de senha
- Catálogo de filmes
- Detalhes dos filmes
- Favoritos
- Comentários
- Denúncias de comentários
- Moderação administrativa
- Controle de acesso baseado em papéis (RBAC)
- Auditoria de ações
- Perfil de usuário
- Upload de foto de perfil
- Armazenamento de imagens no MinIO
- Redis Streams
- Health checks
- Métricas
- Documentação Swagger/OpenAPI
- CI/CD com GitHub Actions
- Execução com Docker e Docker Compose
- Implantação utilizando Portainer


## 2. EVOLUÇÃO DO PROJETO

O desenvolvimento ocorreu de forma incremental, acompanhando as atividades propostas na disciplina.

A primeira etapa foi desenvolvida no repositório catalogo-de-filmes-cloud. Posteriormente, o projeto continuou sua evolução no repositório catalogo-de-filmes-cloud-2.


## 3. ATIVIDADE 1 — AGENDA TELEFÔNICA EM FLASK

Data planejada: 07/08/2026

A primeira atividade foi desenvolvida no repositório:

https://github.com/joicesoato/catalogo-de-filmes-cloud

A atividade trabalhou conceitos iniciais de desenvolvimento de aplicações web, estruturação de projeto, rotas e execução da aplicação.

O desenvolvimento desta etapa serviu como base para a evolução posterior do projeto e para a aplicação dos conceitos de computação em nuvem trabalhados nas atividades seguintes.

A atividade foi realizada com atraso em relação à data planejada.


## 4. ATIVIDADE 2 — CATÁLOGO DE FILMES TOM HANKS

Data planejada: 20/08/2026

Data realizada: 20/08/2026 às 19:48

Situação: Entregue no prazo

Nesta etapa foi desenvolvido o catálogo de filmes sobre Tom Hanks utilizando Node.js e Express.

A aplicação passou a utilizar a API do TMDB para obter informações sobre os filmes.

Foram implementados recursos relacionados aos usuários, favoritos e comentários.

Principais recursos:

- Consulta de filmes
- Exibição das informações dos filmes
- Integração com a API do TMDB
- Cadastro de usuários
- Autenticação
- Favoritos
- Comentários
- Persistência de dados no banco de dados

Tecnologias utilizadas:

- Node.js
- Express
- MariaDB/MySQL
- TMDB API
- express-session
- bcryptjs
- dotenv

A chave da API do TMDB é mantida em variável de ambiente e não é exposta diretamente no frontend.

Evidência da entrega:

https://github.com/joicesoato/catalogo-de-filmes-cloud-2/commit/90ce4c1e17235d496b2dbb990bca1e39f305d091


## 5. ATIVIDADE 3 — DESACOPLANDO O LOGIN

Data planejada: 28/08/2026

Data realizada: 03/09/2026 às 15:59

Situação: Entregue com atraso

Nesta etapa foi criado um microsserviço dedicado à autenticação dos usuários.

O auth-service passou a ser responsável pelas funcionalidades relacionadas à autenticação e ao gerenciamento dos usuários.

Entre suas responsabilidades estão:

- Cadastro de usuários
- Login
- Logout
- Confirmação de e-mail
- Recuperação de senha
- Redefinição de senha
- Emissão e validação de JWT
- Gerenciamento de papéis
- Validação de permissões
- Comunicação com a aplicação principal

O auth-service utiliza a porta interna 3001.

As senhas dos usuários não são armazenadas em texto puro. O projeto utiliza bcryptjs para realizar o hash das senhas.

Os tokens de recuperação de senha possuem validade limitada e são utilizados uma única vez.

Também foram implementados recursos relacionados à confirmação de e-mail e controle de validade dos tokens.

Durante o desenvolvimento foram encontradas dificuldades relacionadas à configuração do serviço de envio de e-mails. Também houve dificuldades com a configuração do Brevo, sendo necessário abrir um chamado junto ao suporte.

Evidência da entrega:

https://github.com/joicesoato/catalogo-de-filmes-cloud-2/commit/b5087e44adb6733f913d7caa79eaadf1f94b0e9a


## 6. ATIVIDADE 4 — CONTROLE DE ACESSO POR PAPEL — RBAC

Data planejada: 04/09/2026

Data realizada: 06/09/2026 às 21:37

Situação: Entregue com atraso

Nesta etapa foi implementado o controle de acesso baseado em papéis, conhecido como RBAC — Role-Based Access Control.

Foram definidos dois papéis principais:

- usuario
- admin

A autorização é realizada no backend.

O sistema verifica as permissões do usuário antes de permitir a execução de operações protegidas.

O usuário comum pode:

- Consultar o catálogo
- Gerenciar seus próprios favoritos
- Criar comentários
- Excluir seus próprios comentários
- Denunciar comentários
- Editar o próprio perfil

O administrador possui, além das permissões do usuário comum, acesso a recursos administrativos.

Entre eles:

- Exclusão de comentários de outros usuários
- Consulta de denúncias
- Atualização de denúncias
- Consulta de registros de auditoria
- Acesso a recursos administrativos

Um dos principais pontos desta atividade foi garantir que operações protegidas não dependessem apenas da interface.

Antes de executar determinadas operações, a aplicação verifica a identidade e as permissões do usuário junto ao serviço de autenticação.

Uma tentativa de usuário sem permissão acessar um recurso administrativo resulta em:

403 Forbidden

Também foi implementada proteção para impedir que um usuário exclua comentários pertencentes a outro usuário.

Evidência da entrega:

https://github.com/joicesoato/catalogo-de-filmes-cloud-2/commit/d777d18f5c0560de8b1ad84935c9cb4d42498940


## 7. ATIVIDADE 5 — LOGS E AUDITORIA

Data planejada: 25/09/2026

Data realizada: 27/09/2026 às 21:39

Situação: Entregue com atraso

Nesta etapa foi criado um serviço específico para trabalhar com logs e auditoria.

O serviço é denominado:

log-service

O objetivo é registrar eventos importantes realizados na aplicação e permitir sua consulta posteriormente.

A arquitetura passou a utilizar Redis Streams para o armazenamento dos eventos.

Stream utilizado:

audit:events

Entre os eventos registrados estão:

- login
- logout
- favorite_add
- favorite_remove
- comment_create
- comment_delete
- access_denied_403
- profile_update
- profile_avatar_upload

Os eventos podem armazenar informações relacionadas à ação realizada, usuário, data e hora e outros detalhes da operação.

Os administradores podem consultar os registros de auditoria por meio do endpoint:

GET /api/admin/logs?limit=50

Usuários comuns não possuem autorização para acessar esse endpoint.

A atividade também consolidou elementos importantes da arquitetura do projeto, incluindo RBAC, auditoria, Redis, arquitetura em serviços e CI/CD.

Evidência da entrega:

https://github.com/joicesoato/catalogo-de-filmes-cloud-2/commit/b39cd42b1fc401d4a70bcf560f7f9481e3539a27

Mensagem do commit:

feat: finalize cloud architecture, RBAC, audit and CI/CD


## 8. ATIVIDADE 6 — UPLOAD E PERFIL DE USUÁRIO

Data planejada: 02/10/2026

Data realizada: 02/10/2026 às 20:22

Situação: Entregue no prazo

Nesta etapa foi implementado o perfil de usuário com possibilidade de edição das informações pessoais e utilização de foto de perfil.

Entre os recursos implementados estão:

- Perfil do usuário
- Nome
- Bio
- E-mail
- Papel do usuário
- Filmes favoritos
- Foto de perfil
- Upload de imagem

A página de perfil utiliza a rota:

/profile/:id

A atualização do perfil utiliza:

PATCH /api/profile/:id

A identidade do usuário é obtida pelo backend a partir da autenticação existente.

O backend não confia em um usuario_id enviado pelo frontend para determinar qual usuário deve ser alterado.

Uma tentativa de editar o perfil de outro usuário resulta em:

403 Forbidden

Essa tentativa também pode gerar um evento de auditoria.

Evidência da entrega:

https://github.com/joicesoato/catalogo-de-filmes-cloud-2/commit/5f8bf70dcba2d8f4d1b9220ccba9ba457d2edee

Mensagem do commit:

feat: conclui atividade 6 e documentacao


## 9. UPLOAD DE FOTO DE PERFIL

O upload da foto de perfil é realizado por meio de:

POST /api/profile/:id/avatar

Formato:

multipart/form-data

Campo utilizado:

foto

O backend realiza validações antes de armazenar o arquivo.

São validados:

- Tipo de arquivo
- MIME type
- Assinatura ou magic bytes
- Tamanho máximo

Os formatos aceitos incluem:

- JPEG
- PNG
- WEBP
- GIF

O tamanho máximo permitido é de 5 MB.

Arquivos que não atendem às validações são rejeitados antes do armazenamento.


## 10. MINIO

O armazenamento das fotos de perfil utiliza MinIO, compatível com a API S3.

O bucket utilizado é:

profile-photos

As imagens são armazenadas utilizando chaves semelhantes a:

profiles/<usuario_id>/<uuid>.jpg

O arquivo binário não é armazenado diretamente no MariaDB.

No banco de dados é armazenada apenas a referência do objeto:

avatar_object_key

A aplicação possui uma rota própria para entregar a imagem:

GET /api/profile/:id/avatar

O backend localiza a referência da imagem no banco de dados, recupera o objeto armazenado no MinIO e entrega a imagem ao navegador.

Dessa forma, o navegador não precisa conhecer as credenciais do MinIO.


## 11. BANCO DE DADOS

O projeto utiliza MariaDB/MySQL para persistência dos dados.

Entre as principais tabelas utilizadas estão:

- usuarios
- favoritos
- comentarios
- reset_tokens
- comentario_denuncias

Na evolução relacionada ao perfil de usuário foram adicionados campos à tabela usuarios, incluindo:

- bio
- avatar_object_key

As alterações de banco são realizadas por meio de migrations.

A migration relacionada a essa etapa está localizada em:

database/migration-v5.sql


## 12. ARQUITETURA DO PROJETO

A arquitetura é composta por diferentes serviços com responsabilidades separadas.

Estrutura simplificada:

                    NAVEGADOR
                         |
                         v
                +----------------+
                |      APP       |
                | React + Express|
                |      :3000     |
                +-------+--------+
                        |
          +-------------+-------------+
          |             |             |
          v             v             v
  +-------------+ +-------------+ +-------------+
  | auth-service| | log-service | |    MinIO    |
  |    :3001    | |    :3002    | |  storage   |
  +------+------+ +------+------+ +-------------+
         |               |
         v               v
  +-------------+ +-------------+
  |   MariaDB   | |    Redis    |
  |    :3306    | |    :6379    |
  +-------------+ +-------------+

Os serviços internos se comunicam pela rede Docker.


## 13. SERVIÇOS

app

Responsável pela aplicação principal, frontend e API Express.

auth-service

Responsável pela autenticação e autorização.

log-service

Responsável pelos registros de auditoria.

db

Banco de dados MariaDB.

redis

Responsável pelo armazenamento e processamento dos eventos de auditoria.

minio

Responsável pelo armazenamento de objetos, principalmente as fotos de perfil.


## 14. FRONTEND

O frontend utiliza:

- React
- TypeScript
- Vite

Entre as principais telas estão:

- Login
- Cadastro
- Confirmação de e-mail
- Recuperação de senha
- Redefinição de senha
- Catálogo
- Detalhes do filme
- Favoritos
- Perfil
- Moderação
- Auditoria administrativa

Durante o build Docker, o Vite gera os arquivos de produção e o Express passa a servir a aplicação.


## 15. SEGURANÇA

Durante a evolução do projeto foram implementados diferentes mecanismos de segurança.

Entre eles:

- Hash de senhas com bcryptjs
- Autenticação
- JWT
- Sessões
- Controle de acesso baseado em papéis
- Proteção de rotas
- Helmet
- Rate limiting
- Validação de arquivos
- Controle de acesso ao perfil
- Autorização centralizada
- Controle de permissões
- Proteção de informações sensíveis

As senhas dos usuários não são armazenadas em texto puro.

As informações sensíveis são configuradas por meio de variáveis de ambiente.


## 16. HEALTH CHECK

A aplicação possui o endpoint:

GET /health

Esse endpoint permite verificar o estado da aplicação e de suas dependências principais.

Exemplo:

{
  "status": "ok",
  "servico": "catalogo"
}

Também existem health checks configurados nos containers Docker.


## 17. MÉTRICAS

A aplicação possui o endpoint:

GET /metrics

As métricas permitem acompanhar informações relacionadas às requisições HTTP, incluindo:

- Método
- Rota
- Status HTTP
- Quantidade de requisições
- Duração das requisições

O formato das métricas é compatível com ferramentas como Prometheus.


## 18. SWAGGER E OPENAPI

A documentação da API foi implementada utilizando Swagger/OpenAPI.

Na aplicação principal:

Swagger UI:

/api/docs

OpenAPI:

/api/openapi.json

Arquivo:

docs/openapi-app.json

No auth-service:

Swagger UI:

/docs

OpenAPI:

/openapi.json

Arquivo:

auth-service/openapi.json

A documentação permite consultar endpoints, parâmetros, corpos das requisições e respostas HTTP.

Também é possível utilizar o recurso "Try it out" para testar endpoints diretamente pela interface do Swagger.


## 19. CI/CD

O projeto possui pipeline de CI/CD utilizando GitHub Actions.

Workflow:

.github/workflows/ci-cd.yml

A pipeline realiza etapas relacionadas a:

1. Instalação das dependências
2. Validação do frontend
3. Build do React
4. Construção das imagens Docker
5. Inicialização do ambiente de testes
6. Verificação dos serviços
7. Verificação dos health checks
8. Verificação das métricas
9. Publicação das imagens Docker

As imagens utilizadas no projeto incluem:

joicesoato/catalogo-filmes-tom-hanks

joicesoato/catalogo-filmes-tom-hanks-auth

joicesoato/catalogo-filmes-tom-hanks-log

As imagens podem utilizar tags como:

latest

ou

<sha-do-commit>


## 20. DOCKER

O projeto utiliza Docker para executar os diferentes serviços em containers.

A aplicação principal utiliza uma construção em múltiplas etapas.

O frontend é construído inicialmente e posteriormente os arquivos de produção são utilizados pelo servidor Express.

Essa abordagem permite executar a aplicação utilizando uma imagem final adequada para produção.


## 21. DOCKER COMPOSE

O ambiente pode ser executado utilizando Docker Compose.

Arquivo principal:

docker-compose.yml

Para iniciar:

docker compose up -d --build

Para verificar os containers:

docker compose ps

Para acompanhar os logs:

docker compose logs -f

Para encerrar os serviços:

docker compose down


## 22. PORTAINER

A implantação no ambiente da disciplina também foi realizada utilizando Portainer.

O arquivo utilizado para a implantação é:

docker-compose.portainer.yml

A aplicação foi configurada utilizando a porta externa:

8211

com o seguinte mapeamento:

8211:3000

Os serviços internos permanecem disponíveis pela rede Docker.

Durante a implantação foram realizados ajustes relacionados às portas dos serviços devido a conflitos existentes no ambiente compartilhado.


## 23. VARIÁVEIS DE AMBIENTE

As variáveis de ambiente necessárias estão documentadas em:

.env.example

Entre as principais variáveis estão:

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

Os valores reais das credenciais não devem ser armazenados no GitHub.


## 24. ESTRUTURA DO PROJETO

Estrutura simplificada:

catalogo-de-filmes-cloud-2/
|
+-- .github/
|   +-- workflows/
|       +-- ci-cd.yml
|
+-- auth-service/
|   +-- index.js
|   +-- openapi.json
|   +-- Dockerfile
|   +-- package.json
|
+-- database/
|   +-- schema.sql
|   +-- migration-v5.sql
|
+-- docs/
|   +-- openapi-app.json
|   +-- P1_ISW055_Joice_Soato_Brito.pdf
|
+-- frontend/
|   +-- src/
|
+-- log-service/
|
+-- middleware/
|
+-- services/
|   +-- audit.js
|   +-- minio.js
|   +-- tmdb.js
|
+-- Dockerfile
+-- docker-compose.yml
+-- docker-compose.portainer.yml
+-- init.sql
+-- server.js
+-- package.json
+-- .env.example
+-- README.md


## 25. EXECUÇÃO LOCAL

Requisitos:

- Git
- Docker
- Docker Compose

Clone o repositório:

git clone https://github.com/joicesoato/catalogo-de-filmes-cloud-2.git

Entre na pasta:

cd catalogo-de-filmes-cloud-2

Configure as variáveis de ambiente utilizando o arquivo .env.example.

Depois execute:

docker compose up -d --build

Verifique os containers:

docker compose ps

A aplicação ficará disponível em:

http://localhost:3000

Health check:

http://localhost:3000/health

Métricas:

http://localhost:3000/metrics

Swagger:

http://localhost:3000/api/docs


## 26. HISTÓRICO DAS ENTREGAS

| Atividade | Data planejada | Data realizada | Situação |
|---|---|---|---|
| Agenda telefônica em Flask | 07/08/2026 | 18/08/2026 | Entregue com atraso |
| Catálogo de filmes — Tom Hanks | 20/08/2026 | 20/08/2026 às 19:48 | Entregue no prazo |
| Microsserviço de autenticação | 28/08/2026 | 03/09/2026 às 15:59 | Entregue com atraso |
| Controle de acesso por papel — RBAC | 04/09/2026 | 06/09/2026 às 21:37 | Entregue com atraso |
| Logs e auditoria | 25/09/2026 | 27/09/2026 às 21:39 | Entregue com atraso |
| Upload e perfil de usuário | 02/10/2026 | 02/10/2026 às 20:22 | Entregue no prazo |

As datas e horários das atividades 2 a 6 foram obtidos a partir do histórico de commits do GitHub, considerando o horário de Brasília (UTC-3).


## 27. PRINCIPAIS TECNOLOGIAS

Desenvolvimento:

- React
- TypeScript
- Vite
- Node.js
- Express

Banco de dados:

- MariaDB
- MySQL

Integrações:

- TMDB API
- MinIO

Autenticação e segurança:

- bcryptjs
- JWT
- express-session
- Helmet
- express-rate-limit
- RBAC

Infraestrutura:

- Docker
- Docker Compose
- Portainer
- Redis
- Redis Streams
- MinIO

Documentação e automação:

- Swagger
- OpenAPI
- GitHub Actions
- Docker Hub

Versionamento:

- Git
- GitHub


## 28. RESULTADOS

Ao longo das atividades, o projeto evoluiu de uma aplicação inicial para uma arquitetura composta por serviços com responsabilidades separadas.

Foram implementados recursos relacionados a:

- Aplicação conteinerizada
- Catálogo de filmes
- Integração com API externa
- Persistência em banco de dados
- Cadastro de usuários
- Autenticação
- Confirmação de e-mail
- Recuperação de senha
- Autorização
- RBAC
- Moderação
- Auditoria
- Redis Streams
- Health checks
- Métricas
- Upload de arquivos
- Perfil de usuário
- Armazenamento de objetos
- Swagger/OpenAPI
- CI/CD


## 29. CONSIDERAÇÕES FINAIS

O projeto permitiu aplicar de forma prática diferentes conceitos relacionados ao desenvolvimento de aplicações e à computação em nuvem.

A aplicação evoluiu progressivamente, passando por desenvolvimento web, integração com API externa, persistência de dados, autenticação, microsserviços, autorização baseada em papéis, logs, auditoria, armazenamento de arquivos e documentação de APIs.

Também foram trabalhados conceitos de conteinerização utilizando Docker e Docker Compose, gerenciamento de serviços com Portainer, armazenamento de objetos com MinIO, processamento e persistência de eventos com Redis Streams e automação de processos por meio do GitHub Actions.

As atividades permitiram compreender não apenas a implementação das funcionalidades, mas também aspectos relacionados à segurança, separação de responsabilidades, comunicação entre serviços, gerenciamento de credenciais e implantação de aplicações distribuídas.

As dificuldades encontradas durante o desenvolvimento contribuíram para o aprendizado prático, principalmente em relação à configuração dos serviços, banco de dados, autenticação, comunicação entre containers, implantação e armazenamento de arquivos.

O projeto foi estruturado buscando manter os serviços separados, reduzir a exposição de portas, proteger informações sensíveis e centralizar as regras de autenticação e autorização no backend.


## 30. INFORMAÇÕES ACADÊMICAS

Aluna: Joice Soato Brito

Curso: Tecnologia em Sistemas Inteligentes

Instituição: FATEC Pompeia

Disciplina: ISW055 — Introdução à Computação em Nuvem

Professor: Prof. Allan Lincoln Rodrigues Siriani

Semestre: 2026.2


## REFERÊNCIAS DO PROJETO

Repositório inicial:

https://github.com/joicesoato/catalogo-de-filmes-cloud

Repositório principal:

https://github.com/joicesoato/catalogo-de-filmes-cloud-2

Relatório acadêmico:

./P1_ISW055_Joice_Soato_Brito.pdf


## 8. ATIVIDADE 6 — PERFIL E UPLOAD DE IMAGEM

A aplicação recebe a foto de perfil no endpoint `POST /api/profile/:id/avatar`, no campo multipart `foto`. O backend valida o tipo real e o tamanho do arquivo antes de armazená-lo no MinIO. O navegador não envia o arquivo como JSON e não precisa definir manualmente o cabeçalho `Content-Type`, pois o `FormData` cria o boundary automaticamente.

Para atualizar uma instalação existente, confirme que o MinIO está acessível pela rede interna do Docker e que `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` e `MINIO_BUCKET` correspondem ao serviço em execução.

## 9. ATIVIDADE 7 — PLANO PREMIUM COM STRIPE

O projeto implementa um checkout de assinatura com Stripe em modo de teste. Os dados do cartão são digitados exclusivamente na página hospedada pelo Stripe; a aplicação não armazena número de cartão, CVV ou validade.

### Configuração do banco

Execute uma vez no banco de dados já utilizado pelo projeto:

```bash
mysql -h "$DB_HOST" -u "$DB_USER" -p "$DB_NAME" < database/migration-v6.sql
```

A migração adiciona `premium`, `stripe_customer_id`, `stripe_subscription_id` e `premium_updated_at` à tabela `usuarios`, preservando os usuários existentes.

### Configuração do Stripe em modo de teste

1. Entre no [Dashboard do Stripe](https://dashboard.stripe.com/) e ative **Test mode**.
2. Em Product catalog, crie o produto **Plano Premium** e um preço recorrente mensal, por exemplo **R$ 9,90/mês**.
3. Copie o ID do preço, que começa com `price_`.
4. Em Developers → API keys, copie a chave secreta de teste, que começa com `sk_test_`.
5. Configure no Portainer/ambiente da aplicação:
   - `STRIPE_SECRET_KEY`: chave secreta de teste (`sk_test_...`).
   - `STRIPE_PRICE_ID`: ID do preço recorrente (`price_...`).
   - `STRIPE_WEBHOOK_SECRET`: segredo de assinatura do webhook (`whsec_...`).
6. Cadastre um webhook para `https://SEU-DOMINIO/api/stripe/webhook` com os eventos:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
7. Use a chave `whsec_...` fornecida para esse endpoint. Não use a chave de produção nem compartilhe esses segredos publicamente.

Para testar localmente, o Stripe CLI pode encaminhar eventos para `http://localhost:3000/api/stripe/webhook`; use o segredo `whsec_...` informado pelo comando `stripe listen`.

### Fluxo implementado

- `POST /api/premium/checkout`: exige usuário autenticado e cria uma Checkout Session no Stripe.
- `POST /api/stripe/webhook`: valida a assinatura HMAC do Stripe e só então processa o evento.
- Após confirmação de pagamento, o usuário recebe `premium = true` e os IDs do cliente/assinatura.
- Se a assinatura for cancelada ou deixar de estar ativa, o webhook atualiza o status Premium.
- O perfil mostra o selo **PREMIUM** quando o plano está ativo e oferece o botão para iniciar o checkout a quem ainda não assina.

### Cartão de teste

No modo de teste do Stripe, use o cartão de teste `4242 4242 4242 4242`, uma data futura e qualquer CVC de três dígitos. Não utilize cartões reais. A confirmação do Premium depende da entrega do webhook válido; aguarde alguns segundos e atualize o perfil após finalizar o checkout.
