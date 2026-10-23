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
- Assinatura Premium com Stripe Checkout em modo de teste
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



## 10. ATIVIDADE 7 — PLANO PREMIUM COM STRIPE

A Atividade 7 acrescenta ao catálogo um modelo de assinatura Premium com cobrança real em **modo de teste** por meio do Stripe Checkout. O processamento dos dados de cartão ocorre na página hospedada pelo Stripe; a aplicação não deve armazenar número do cartão, CVV ou validade.

### Regras de negócio

- Usuários comuns podem manter até 10 filmes favoritos.
- Usuários Premium podem salvar favoritos sem esse limite.
- O envio de foto de perfil é restrito a usuários Premium.
- O perfil exibe o selo Premium com base no status persistido no banco de dados.
- O checkout é criado no backend e utiliza um preço recorrente configurado no Stripe.
- O status Premium é atualizado a partir de eventos recebidos do Stripe e validados no webhook.
- O papel administrativo continua independente da assinatura: Premium não concede permissões de administrador.

### Fluxo de assinatura

1. O usuário autenticado solicita a criação do checkout.
2. O backend cria uma Checkout Session com o preço recorrente definido por `STRIPE_PRICE_ID`.
3. O usuário é direcionado à página hospedada pelo Stripe para concluir o pagamento de teste.
4. O Stripe envia eventos ao endpoint de webhook da aplicação.
5. O backend valida a assinatura enviada no cabeçalho `Stripe-Signature` usando `STRIPE_WEBHOOK_SECRET`.
6. Depois de processar um evento válido, o backend atualiza o status e os identificadores Stripe associados ao usuário.

Endpoints envolvidos:

- `POST /api/premium/checkout`: exige autenticação e inicia o checkout.
- `POST /api/stripe/webhook`: recebe eventos Stripe e valida a assinatura antes de processá-los.

O redirecionamento de retorno do checkout, por si só, não deve ser tratado como comprovante de pagamento. A atualização do Premium depende do processamento de eventos válidos do Stripe.

### 1. Atualizar o banco de dados

Antes de implantar a nova imagem, aplique a migration no **banco já utilizado pela Stack**:

```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < database/migration-v6.sql
```

A migration adiciona os campos necessários à assinatura, incluindo `premium`, `stripe_customer_id`, `stripe_subscription_id` e `premium_updated_at` à tabela `usuarios`, preservando os registros existentes.

Cuidados importantes:

- Confirme que as variáveis `DB_HOST`, `DB_PORT`, `DB_NAME` e `DB_USER` apontam para o banco correto.
- Faça backup antes de alterar o banco.
- Execute a migration uma única vez, verificando antes se ela já foi aplicada.
- Não use `init.sql` como substituto da migration em um banco existente.
- Não remova os volumes do banco para tentar resolver erros de coluna.

### 2. Configurar o Stripe em modo de teste

1. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com/) e habilite **Test mode**.
2. Crie o produto **Plano Premium** no catálogo de produtos.
3. Adicione um preço recorrente mensal. O valor de exemplo pode ser R$ 9,90/mês; escolha e documente o preço realmente criado.
4. Copie o identificador do preço, iniciado por `price_`.
5. Em **Developers → API keys**, copie a chave secreta de teste, iniciada por `sk_test_`.
6. Configure as variáveis de ambiente da aplicação.
7. Cadastre o endpoint de webhook e copie o segredo gerado para esse endpoint.

Variáveis necessárias:

| Variável | Finalidade |
|---|---|
| `STRIPE_SECRET_KEY` | Chave secreta de teste do Stripe (`sk_test_...`). |
| `STRIPE_PRICE_ID` | Identificador do preço recorrente (`price_...`). |
| `STRIPE_WEBHOOK_SECRET` | Segredo usado para validar a assinatura dos eventos (`whsec_...`). |
| `APP_URL` | URL pública da aplicação usada para os redirecionamentos de retorno. |

No Portainer, inclua essas variáveis na Stack/serviço da aplicação e recrie ou atualize o serviço para que sejam carregadas. Não publique valores reais no README, no GitHub ou em capturas de tela.

### 3. Configurar o webhook

Cadastre no Dashboard do Stripe o endpoint:

```text
https://SEU-DOMINIO/api/stripe/webhook
```

Substitua `SEU-DOMINIO` pelo domínio HTTPS real da aplicação. Configure pelo menos os seguintes eventos, conforme suportados pelo código da aplicação:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copie o segredo `whsec_...` associado ao endpoint cadastrado e use-o em `STRIPE_WEBHOOK_SECRET`. O segredo gerado pelo Stripe CLI para desenvolvimento local é diferente do segredo do endpoint cadastrado no Dashboard.

Para testes locais, o Stripe CLI pode encaminhar eventos para:

```text
http://localhost:3000/api/stripe/webhook
```

Use o segredo exibido pelo comando `stripe listen` no ambiente local. Nunca utilize chaves de produção durante os testes acadêmicos.

### 4. Cartão de teste

No modo de teste, um cartão de teste comum é:

- Número: `4242 4242 4242 4242`
- Validade: qualquer data futura válida
- CVC: qualquer código de três dígitos

Use apenas dados de teste disponibilizados pela documentação do Stripe, nunca dados de um cartão real. Após concluir o checkout, aguarde o webhook ser recebido e processado; depois, atualize o perfil para verificar o status Premium.

### 5. Testes de aceitação

- [ ] `GET /health` retorna HTTP 200 e indica que as dependências estão saudáveis.
- [ ] Um usuário autenticado sem Premium consegue iniciar o checkout.
- [ ] Um usuário comum com 10 favoritos recebe HTTP 403 ao tentar adicionar o 11º.
- [ ] Um usuário comum recebe HTTP 403 ao tentar enviar foto de perfil.
- [ ] Um usuário Premium consegue ultrapassar o limite de 10 favoritos.
- [ ] Um usuário Premium consegue enviar uma imagem válida, respeitando as validações existentes.
- [ ] Um evento de webhook com assinatura inválida é rejeitado.
- [ ] Um evento válido atualiza o estado da assinatura conforme o status recebido do Stripe.
- [ ] O cancelamento ou encerramento da assinatura atualiza o status Premium conforme a regra implementada.
- [ ] O perfil mostra o selo Premium somente quando o status persistido estiver ativo.
- [ ] O usuário Premium não recebe privilégios administrativos apenas por possuir a assinatura.

Se o perfil apresentar erro como `Unknown column 'premium'`, verifique se `database/migration-v6.sql` foi aplicada ao banco que a aplicação realmente utiliza.

## 11. MINIO

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


## 12. BANCO DE DADOS

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


## 13. ARQUITETURA DO PROJETO

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


## 14. SERVIÇOS

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


## 15. FRONTEND

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


## 16. SEGURANÇA

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


## 17. HEALTH CHECK

A aplicação possui o endpoint:

GET /health

Esse endpoint permite verificar o estado da aplicação e de suas dependências principais.

Exemplo:

{
  "status": "ok",
  "servico": "catalogo"
}

Também existem health checks configurados nos containers Docker.


## 18. MÉTRICAS

A aplicação possui o endpoint:

GET /metrics

As métricas permitem acompanhar informações relacionadas às requisições HTTP, incluindo:

- Método
- Rota
- Status HTTP
- Quantidade de requisições
- Duração das requisições

O formato das métricas é compatível com ferramentas como Prometheus.


## 19. SWAGGER E OPENAPI

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


## 20. CI/CD

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


## 21. DOCKER

O projeto utiliza Docker para executar os diferentes serviços em containers.

A aplicação principal utiliza uma construção em múltiplas etapas.

O frontend é construído inicialmente e posteriormente os arquivos de produção são utilizados pelo servidor Express.

Essa abordagem permite executar a aplicação utilizando uma imagem final adequada para produção.


## 22. DOCKER COMPOSE

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


## 23. PORTAINER

A implantação no ambiente da disciplina também foi realizada utilizando Portainer.

O arquivo utilizado para a implantação é:

docker-compose.portainer.yml

A aplicação foi configurada utilizando a porta externa:

8211

com o seguinte mapeamento:

8211:3000

Os serviços internos permanecem disponíveis pela rede Docker.

Durante a implantação foram realizados ajustes relacionados às portas dos serviços devido a conflitos existentes no ambiente compartilhado.


## 24. VARIÁVEIS DE AMBIENTE

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

STRIPE_SECRET_KEY
STRIPE_PRICE_ID
STRIPE_WEBHOOK_SECRET
APP_URL

Os valores reais das credenciais não devem ser armazenados no GitHub.


## 25. ESTRUTURA DO PROJETO

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


## 26. EXECUÇÃO LOCAL

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


## 27. HISTÓRICO DAS ENTREGAS

| Atividade | Data planejada | Data realizada | Situação |
|---|---|---|---|
| Agenda telefônica em Flask | 07/08/2026 | 18/08/2026 | Entregue com atraso |
| Catálogo de filmes — Tom Hanks | 20/08/2026 | 20/08/2026 às 19:48 | Entregue no prazo |
| Microsserviço de autenticação | 28/08/2026 | 03/09/2026 às 15:59 | Entregue com atraso |
| Controle de acesso por papel — RBAC | 04/09/2026 | 06/09/2026 às 21:37 | Entregue com atraso |
| Logs e auditoria | 25/09/2026 | 27/09/2026 às 21:39 | Entregue com atraso |
| Upload e perfil de usuário | 02/10/2026 | 02/10/2026 às 20:22 | Entregue no prazo |
| Plano Premium com Stripe | 16/10/2026 | 16/10/2026 | Entregue no dia da entrega |

As datas e horários das atividades 2 a 6 foram obtidos a partir do histórico de commits do GitHub, considerando o horário de Brasília (UTC-3). A Atividade 7 foi registrada como realizada em 16/10/2026, data da entrega.


## 28. PRINCIPAIS TECNOLOGIAS

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
- Stripe Checkout

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


## DOCUMENTAÇÃO TÉCNICA E MODELOS DE SERVIÇO

A documentação reversa do sistema — especificação funcional, arquitetura, regras de negócio, modelo de dados e classificação SaaS/PaaS/IaaS — está disponível em:

[DOCUMENTACAO.md — Documentação técnica do projeto](./DOCUMENTACAO.md)

### Classificação resumida de SaaS, PaaS e IaaS

| Modelo | Aplicação no projeto |
|---|---|
| **IaaS** | Servidor ou máquina virtual de hospedagem, quando fornecido como infraestrutura virtualizada e administrado pela equipe. |
| **PaaS** | Não há, no Compose atual, indicação de uma plataforma PaaS gerenciada específica. Docker e Portainer são ferramentas de implantação e gerenciamento, não PaaS automaticamente. |
| **SaaS / APIs externas** | Stripe Checkout, API TMDB, provedor SMTP, GitHub/GitHub Actions e Docker Hub, consumidos como serviços externos. |

MariaDB, Redis e MinIO são executados como serviços autogerenciados em containers no Compose. A classificação da hospedagem deve refletir o serviço realmente fornecido pelo provedor.

Professor: [Prof. Allan Lincoln Rodrigues Siriani](https://github.com/siriani)

---

## 29. RESULTADOS

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
- Assinatura Premium e integração com webhook Stripe
- Armazenamento de objetos
- Swagger/OpenAPI
- CI/CD


## 30. CONSIDERAÇÕES FINAIS

O projeto permitiu aplicar de forma prática diferentes conceitos relacionados ao desenvolvimento de aplicações e à computação em nuvem.

A aplicação evoluiu progressivamente, passando por desenvolvimento web, integração com API externa, persistência de dados, autenticação, microsserviços, autorização baseada em papéis, logs, auditoria, armazenamento de arquivos e documentação de APIs.

Também foram trabalhados conceitos de conteinerização utilizando Docker e Docker Compose, gerenciamento de serviços com Portainer, armazenamento de objetos com MinIO, processamento e persistência de eventos com Redis Streams e automação de processos por meio do GitHub Actions.

As atividades permitiram compreender não apenas a implementação das funcionalidades, mas também aspectos relacionados à segurança, separação de responsabilidades, comunicação entre serviços, gerenciamento de credenciais e implantação de aplicações distribuídas.

As dificuldades encontradas durante o desenvolvimento contribuíram para o aprendizado prático, principalmente em relação à configuração dos serviços, banco de dados, autenticação, comunicação entre containers, implantação e armazenamento de arquivos.

O projeto foi estruturado buscando manter os serviços separados, reduzir a exposição de portas, proteger informações sensíveis e centralizar as regras de autenticação e autorização no backend.


## 31. INFORMAÇÕES ACADÊMICAS

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
