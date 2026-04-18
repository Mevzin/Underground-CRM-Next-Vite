# Underground Prodigy (underground-crm)

CRM para gestão de clientes, veículos e pedidos (ordens de serviço), com login via Discord e persistência em MongoDB.

## Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- NextAuth (Discord OAuth)
- Mongoose (MongoDB)
- Zod (validação de payload)
- ESLint

## Como rodar localmente

### Requisitos

- Node.js (recomendado 18+)
- MongoDB (Atlas ou local)
- Um app OAuth do Discord (Client ID/Secret)

### Instalação

```bash
npm install
```

### Variáveis de ambiente

Crie um arquivo `.env.local` (ou `.env`) na raiz do projeto com:

```bash
MONGODB_URI="mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority"
MONGODB_DB="underground_crm"

AUTH_SECRET="<um_secret_grande_e_aleatorio>"
AUTH_DISCORD_ID="<discord_oauth_client_id>"
AUTH_DISCORD_SECRET="<discord_oauth_client_secret>"
AUTH_URL="http://localhost:3000"
```

Notas:

- Não commite esse arquivo.
- `AUTH_SECRET` é usado para assinar JWT e proteger a sessão.
- `MONGODB_DB` define o `dbName` usado pelo Mongoose.

### Subir o projeto

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Autenticação e autorização (Discord)

O login é feito via NextAuth + Discord:

- Rotas: `src/app/api/auth/[...nextauth]/route.ts`
- Configuração: `src/lib/auth.ts`

Fluxo:

1. Usuário faz login com Discord.
2. Se o usuário não existir no banco, ele é criado com `isAuthorized: false`.
3. Enquanto `isAuthorized` for `false`, o acesso é negado e o usuário fica “pendente”.

### Como autorizar um usuário

Após o primeiro login de um Discord, um documento é criado em `users`.

Para liberar acesso, altere no MongoDB:

```js
db.users.updateOne(
  { discordId: "<discord_id>" },
  { $set: { isAuthorized: true, role: "mechanic" } }
)
```

Validação de acesso nas APIs: `src/lib/auth-guard.ts` (`requireAuthorizedUser()`).

## Dados e regras de negócio

### Modelos (MongoDB)

- `Client` (`src/models/Client.ts`)
  - `isBanned`: bloqueia o uso do cliente no sistema.
- `Vehicle` (`src/models/Vehicle.ts`)
  - Índice único: `(clientId + vin)` para impedir VIN duplicado no mesmo cliente.
- `Order` (`src/models/Order.ts`)
  - Referencia `clientId` (obrigatório) e `vehicleId` (opcional).
- `User` (`src/models/User.ts`)
  - `discordId` único e `isAuthorized` para controle de acesso.

### Limite de veículos por cliente

Ao trocar proprietário e ao criar/atribuir veículos, o sistema aplica a regra de “vagas”:

- Cliente banido não pode receber veículos.
- Cliente só pode ter até 2 veículos.

## Funcionalidades principais

- Clientes
  - Cadastro e edição
  - Banir/desbanir
- Veículos
  - Cadastro e edição
  - Banir/desbanir
  - Trocar proprietário
- Pedidos (ordens)
  - Criar/editar pedidos vinculados a cliente e (opcionalmente) a veículo

### Troca de proprietário de veículo

Ao abrir o modal do veículo, existe a ação “Alterar proprietário” que lista clientes elegíveis (não banidos e com vaga, ou com opção de mescla quando há conflito).

Regras na troca:

- Se o cliente de destino já tiver um veículo com o mesmo `vin`, o sistema pode “mesclar” (reapontar pedidos e remover duplicado).
- Há tratamento para conflitos antigos envolvendo `plate` (caso exista índice legado no banco).

Implementação:

- UI: `src/components/ClientList.tsx`
- API: `src/app/api/vehicles/[id]/route.ts` (PATCH)

## Endpoints (API)

Rotas em `src/app/api/*`:

- `GET /api/me`
- `GET|POST /api/clients`
- `GET|PUT|PATCH|DELETE /api/clients/:id`
- `GET|POST /api/vehicles`
- `GET|PUT|PATCH|DELETE /api/vehicles/:id`
- `GET|POST /api/orders`
- `GET|PUT|DELETE /api/orders/:id`

Observação: as APIs exigem login e usuário autorizado (401/403 quando aplicável).

## Build e produção

```bash
npm run build
npm run start
```

## Troubleshooting

- Erro 401/403 nas APIs
  - Faça login novamente e confirme `users.isAuthorized = true` no MongoDB.
- Erro 409 ao trocar proprietário
  - Indica conflito de unicidade (VIN/placa) para o cliente de destino; a API trata mescla quando possível.

## Nota de manutenção

Durante a elaboração deste README a busca automática do código não estava disponível; as referências foram levantadas conferindo diretamente os arquivos principais do projeto.
