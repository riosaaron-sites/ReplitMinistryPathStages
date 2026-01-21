# MinistryPath - Run Instructions

## Prerequisites
- Node.js 20+ 
- npm or pnpm
- PostgreSQL database (Neon recommended)
- OpenAI API key (for PDF analysis features)

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Environment Setup

Copy the example environment file:
```bash
cp 07_RUN_INSTRUCTIONS/.env.example .env
```

Fill in the required values (see section below).

---

## 3. Database Setup

### Push Schema to Database
```bash
npm run db:push
```

This uses Drizzle Kit to sync the schema to your PostgreSQL database.

### Generate Migrations (if needed)
```bash
npm run db:generate
```

### Run Migrations
```bash
npm run db:migrate
```

---

## 4. Seed Data (Optional)

The application seeds some core data on startup:
- Help articles (via `seedHelpArticles.ts`)
- Core ministries and categories (via `seedCoreData.ts`)

To manually register training manuals:
1. Place PDF files in `attached_assets/` or `uploads/manuals/`
2. Use Admin Panel > "Register Manuals" function
3. Run "Analyze Training Manuals" to generate content

---

## 5. Start the Application

### Development Mode
```bash
npm run dev
```

This starts:
- Express backend on port 5000
- Vite dev server (proxied through Express)

### Production Build
```bash
npm run build
npm start
```

---

## 6. Access the Application

- **Frontend:** http://localhost:5000
- **API Health:** http://localhost:5000/api/health

---

## 7. First Admin Setup

The application uses secure admin bootstrap (no hardcoded credentials).

To create the first admin user:

```bash
curl -X POST http://localhost:5000/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YourSecurePassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "bootstrapKey": "YOUR_STATUS_KEY_VALUE"
  }'
```

**Note:** This only works when no admin/owner users exist in the database.

---

## 8. Authentication

The app uses Replit Auth (OpenID Connect). For local development without Replit:
- You may need to mock the OIDC provider
- Or use the email/password fallback if implemented

---

## 9. Troubleshooting

### Database Connection Issues
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Training Modules Not Loading
1. Check if manuals are registered: `SELECT * FROM manuals`
2. Check if analysis exists: `SELECT * FROM manual_analysis`
3. Check training modules: `SELECT * FROM training_modules`

### Calendar/Room Features
1. Ensure calendar_categories are seeded
2. Ensure rooms exist in rooms table
3. Check API responses in browser dev tools

---

## 10. Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run db:push` | Push schema to DB |
| `npm run db:generate` | Generate migrations |
| `npm run db:migrate` | Run migrations |
| `npm run db:studio` | Open Drizzle Studio |

---

## 11. Project Structure

```
client/           # React frontend (Vite)
  src/
    pages/        # Page components
    components/   # Reusable components
    lib/          # Utilities, query client
server/           # Express backend
  routes.ts       # API routes (~10,700 lines)
  storage.ts      # Database operations
  *.ts            # Services (email, training, etc.)
shared/           # Shared types and schema
  schema.ts       # Drizzle schema
migrations/       # Database migrations
attached_assets/  # PDF manuals (65 files)
```
