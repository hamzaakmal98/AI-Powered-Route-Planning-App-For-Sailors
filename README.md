# Knot Ready

Next-gen sailing readiness and passage planning suite. Powered by Next.js and a flexible AI engine (OpenAI/Ollama) for intelligent maritime safety.


    🚢 Decision Support: AI-driven analysis of sailing conditions and crew readiness.

    📡 Edge AI Capability: Support for local LLMs via Ollama for offline use at sea.

    ⚡ Modern Stack: Built with Next.js 15, Bun, Tailwind CSS, and Prisma.

    🔐 Secure by Design: Full OAuth 2.0 integration and encrypted session handling.

## Prerequisites

- [Bun](https://bun.sh) (package manager and runtime)
- PostgreSQL database
- Node.js 20+ (if not using Bun runtime)

## Environment Setup

Create a `.env` file in the root directory with the following environment variables:

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/knot_ready?schema=public"

# JWT Authentication
JWT_SECRET="your-secret-key-here-minimum-32-characters-long"
JWT_COOKIE_NAME="auth-token"

# Google OAuth (for authentication)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
OAUTH_CODE_VERIFIER="your-oauth-code-verifier"

# Site URL
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# LLM Provider Configuration
# Choose which LLM provider to use: 'openai' or 'ollama' (default: 'openai')
LLM_PROVIDER="openai"

# OpenAI Configuration (required if LLM_PROVIDER is 'openai')
OPENAI_API_KEY="your-openai-api-key"
GPT_MODEL="gpt-4o-mini"  # Optional: OpenAI model name (default: 'gpt-4o-mini')

# Ollama Configuration (required if LLM_PROVIDER is 'ollama')
OLLAMA_MODEL="llama2"  # Optional: Ollama model name (default: 'llama2')
```

### Environment Variables Explained

- **DATABASE_URL**: PostgreSQL connection string. Format: `postgresql://[user]:[password]@[host]:[port]/[database]`
- **JWT_SECRET**: Secret key for signing JWT tokens. Use a long, random string (minimum 32 characters).
- **JWT_COOKIE_NAME**: Name of the cookie storing the authentication token (defaults to `auth-token` if not set).
- **GOOGLE_CLIENT_ID** & **GOOGLE_CLIENT_SECRET**: OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/). Create OAuth 2.0 credentials and add `http://localhost:3000/api/auth/callback/google/signin` as an authorized redirect URI.
- **OAUTH_CODE_VERIFIER**: Code verifier for OAuth PKCE flow. Generate a secure random string.
- **NEXT_PUBLIC_SITE_URL**: The public URL of your application. Use `http://localhost:3000` for local development.
- **LLM_PROVIDER**: Choose which LLM provider to use. Set to `'openai'` (default) to use OpenAI, or `'ollama'` to use a local Ollama instance.
- **OPENAI_API_KEY**: Your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys). Required when `LLM_PROVIDER="openai"`.
- **GPT_MODEL**: OpenAI model name to use (e.g., `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`). Defaults to `gpt-4o-mini` if not set.
- **OLLAMA_MODEL**: Ollama model name to use (e.g., `llama2`, `llama3`, `mistral`). Defaults to `llama2` if not set. Required when `LLM_PROVIDER="ollama"`.

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Set Up Database

Make sure PostgreSQL is running and create a database:

```bash
# Create database (using psql)
createdb knot_ready

# Or using SQL
psql -U postgres -c "CREATE DATABASE knot_ready;"
```

### 3. Run Database Migrations

```bash
bun run db:migrate:deploy
```

This will apply all Prisma migrations to set up the database schema.

### 4. Generate Prisma Client

```bash
bunx prisma generate
```

### 5. Start Development Server

```bash
bun dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `bun dev` - Start the development server
- `bun build` - Build the application for production (generates Prisma client and builds Next.js)
- `bun start` - Start the production server
- `bun run db:migrate:deploy` - Deploy database migrations
- `bun lint` - Run ESLint

## Project Structure

- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components
- `src/lib/` - Utility libraries and client configurations
- `src/server/` - Server-side code (Hono routes, actions)
- `prisma/` - Database schema and migrations

```mermaid graph TD User((Sailor)) -->|Interacts| UI[Next.js Frontend]
    
subgraph "Next.js App (Server-Side)"
    UI -->|Next.js Actions| Hono[Hono API Handlers]
    Hono -->|Auth| Google[Google OAuth / JWT]
    Hono -->|Database Operations| Prisma[Prisma ORM]
end

subgraph "AI Reasoning Engine"
    Hono -->|Query| AI_Router{Provider Selector}
    AI_Router -->|Cloud| OpenAI[OpenAI GPT-4o-mini]
    AI_Router -->|Local/Offline| Ollama[Local Ollama Instance]
end

subgraph "External Systems"
    Prisma -->|Persists Data| Postgres[(PostgreSQL DB)]
end

style UI fill:#0070f3,color:#fff,stroke:#333
style Ollama fill:#ff5722,color:#fff,stroke:#333
style OpenAI fill:#10a37f,color:#fff,stroke:#333

```

## Database

This project uses [Prisma](https://www.prisma.io) as the ORM. The schema is defined in `prisma/schema.prisma`.

To create a new migration after schema changes:

```bash
bunx prisma migrate dev --name your_migration_name
```

To view the database in Prisma Studio:

```bash
bunx prisma studio
```

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running: `pg_isready` or check your PostgreSQL service
- Verify `DATABASE_URL` is correct and the database exists
- Check that your database user has proper permissions

### OAuth Issues

- Verify redirect URI in Google Cloud Console matches `NEXT_PUBLIC_SITE_URL/api/auth/callback/google/signin`
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check that `OAUTH_CODE_VERIFIER` is set

### LLM Provider Issues

**OpenAI:**
- Verify `OPENAI_API_KEY` is set and valid when using `LLM_PROVIDER="openai"`
- Check your OpenAI account has sufficient credits/quota
- Ensure `GPT_MODEL` matches an available model in your OpenAI account

**Ollama:**
- Ensure Ollama is installed and running locally when using `LLM_PROVIDER="ollama"`
- Verify the model specified in `OLLAMA_MODEL` is downloaded: `ollama pull <model-name>`
- Check Ollama is accessible at the default endpoint (usually `http://localhost:11434`)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Bun Documentation](https://bun.sh/docs)
