# Supabase Setup

This project uses Supabase for authentication, database storage, and realtime game updates.

## 1. Open the project terminal

Run these commands in the VS Code PowerShell terminal, not in the Supabase SQL Editor:

```powershell
cd "C:\Users\Daniel Henry\Desktop\vibe-quizs-main\vibe-quizs-main"
npm install
npx supabase login
npx supabase link --project-ref hmxzhiirzjzvdbnowwbh
npx supabase db push
npm run dev
```

When `npx supabase login` opens a browser, sign in to the Supabase account that owns the project.

Open the app at:

```text
http://localhost:8081
```

## 2. What each command does

- `cd` opens the project folder.
- `npm install` installs the project dependencies.
- `npx supabase login` signs the Supabase CLI into your account.
- `npx supabase link` connects this local project to the new Supabase project.
- `npx supabase db push` applies the migrations in `supabase/migrations`.
- `npm run dev` starts the local app.

## 3. Important: use the correct place

Run `cd`, `npm`, and `npx` commands in the VS Code terminal.

Use the Supabase SQL Editor only for SQL statements such as:

```sql
CREATE TABLE
ALTER TABLE
CREATE POLICY
CREATE FUNCTION
```

Do not paste PowerShell commands such as `cd` into the SQL Editor. PostgreSQL will reject them with a syntax error.

## 4. Environment variables

The local `.env` file contains the new Supabase project URL and publishable key. It is intentionally excluded from GitHub.

For deployment, add these environment variables to the hosting provider:

```text
VITE_SUPABASE_URL=https://hmxzhiirzjzvdbnowwbh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_SUPABASE_KEY=your-supabase-publishable-key
```

Never expose a Supabase service-role key in a variable beginning with `VITE_` or in browser code.

## 5. Basic test

After the app starts:

1. Open `http://localhost:8081`.
2. Select **Sign in**.
3. Create an account.
4. Complete onboarding.
5. Create a game.
6. Open a second browser window and join the game.

If a migration command fails, copy the complete error message and check which migration failed before continuing.
