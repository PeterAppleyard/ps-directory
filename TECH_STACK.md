# Technical Stack Documentation

## Technology Choices

### Frontend Framework: SvelteKit 5
**Why**: Fast, modern, excellent DX, built-in SSR, small bundle size

**Key Features Used**:
- File-based routing (`src/routes/`)
- Server-side rendering (SSR)
- Load functions for data fetching
- Form actions (for submissions)
- Layouts for shared UI

**Important**: Using SvelteKit 5 (latest) - check MCP for current patterns as they differ from v4.

### Language: TypeScript
**Configuration**: Strict mode enabled
**Type Definitions**: `src/lib/types/index.ts`

### Styling: Tailwind CSS v4
**Major Change from v3**: Config is now in CSS, not JavaScript

**Location**: `src/routes/layout.css`

**Syntax**:
```css
@import 'tailwindcss';
@plugin '@tailwindcss/forms';

@theme {
  --font-sans: 'Helvetica Neue', sans-serif;
  --color-brand: #000000;
}
```

**No `tailwind.config.js` file needed** - this is v4 standard.

### Database & Backend: Supabase
**Project Name**: `pands`
**Free Tier Limits**:
- 500MB database storage
- 1GB file storage
- 2GB bandwidth per month

**Services Used**:
- PostgreSQL database (houses, images tables)
- Authentication (for user submissions)
- Storage (house-images bucket)
- Row Level Security (RLS) for access control

### Package Manager: npm
Standard, universally supported.

## Project Structure

```
ps-directory/
├── src/
│   ├── lib/
│   │   ├── components/          # Reusable Svelte components
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript type definitions
│   │   └── supabase.ts         # Supabase client initialization
│   ├── routes/
│   │   ├── +layout.svelte      # Root layout (nav, etc)
│   │   ├── +page.svelte        # Homepage (house grid)
│   │   ├── +page.ts            # Homepage data loading
│   │   ├── layout.css          # Tailwind v4 config + global styles
│   │   ├── house/
│   │   │   └── [id]/
│   │   │       └── +page.svelte  # House detail page (TODO)
│   │   ├── submit/
│   │   │   └── +page.svelte    # Submission form
│   │   └── about/
│   │       └── +page.svelte    # About/history (TODO)
│   └── app.html                # Root HTML template
├── static/                      # Static assets (images, fonts)
├── .env.local                   # Environment variables (gitignored)
├── package.json
├── svelte.config.js
├── tsconfig.json
└── vite.config.ts
```

## Database Schema

### `houses` table
```sql
id                  uuid primary key
created_at          timestamp with time zone
address_street      text not null
address_suburb      text not null
address_state       text not null (default 'NSW')
address_postcode    text not null
latitude            numeric(10, 8)
longitude           numeric(11, 8)
style               text not null (Lowline, Highline, Split-level, Other)
year_built          integer
builder_name        text
description         text
condition           text (Original, Renovated, At Risk, Demolished)
status              text (pending, published, rejected) default 'pending'
contributor_id      uuid references auth.users(id)
verified_by         text
verification_notes  text
```

**Indexes**:
- `houses_suburb_idx` on address_suburb
- `houses_style_idx` on style
- `houses_status_idx` on status

**RLS Policies**:
- Public can SELECT where status='published'
- Authenticated users can INSERT (status defaults to 'pending')

### `images` table
```sql
id              uuid primary key
created_at      timestamp with time zone
house_id        uuid references houses(id) on delete cascade
storage_path    text not null
caption         text
is_primary      boolean default false
sort_order      integer default 0
contributor_id  uuid references auth.users(id)
```

**RLS Policies**:
- Public can SELECT images where linked house is published

### Storage Bucket: `house-images`
- Public bucket
- Stores user-uploaded photos
- Paths referenced in images.storage_path
- Public can read, authenticated can upload

## Environment Variables

**File**: `.env.local` (gitignored)

```bash
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

**Access in Code**:
```typescript
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
```

## Dependencies

### Core
- `@sveltejs/kit` - SvelteKit framework
- `@sveltejs/adapter-auto` - Deployment adapter
- `svelte` - Svelte compiler
- `vite` - Build tool

### Database
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - SSR helpers for Supabase

### Styling
- `tailwindcss` - v4 (CSS-based config)
- `@tailwindcss/forms` - Form styling plugin

### Development
- `typescript` - Type checking
- `@sveltejs/vite-plugin-svelte` - Vite integration
- `eslint` - Linting
- `prettier` - Code formatting
- `vitest` - Testing framework

## Supabase Client Setup

**File**: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

export const supabase = createClient(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
)
```

**Usage**:
```typescript
import { supabase } from '$lib/supabase'

const { data, error } = await supabase
  .from('houses')
  .select('*')
  .eq('status', 'published')
```

## Type Definitions

**File**: `src/lib/types/index.ts`

```typescript
export interface House {
  id: string
  created_at: string
  address_street: string
  address_suburb: string
  address_state: string
  address_postcode: string
  latitude: number | null
  longitude: number | null
  style: string
  year_built: number | null
  builder_name: string | null
  description: string | null
  condition: string | null
  status: 'pending' | 'published' | 'rejected'
  contributor_id: string | null
  verified_by: string | null
  verification_notes: string | null
}

export interface Image {
  id: string
  created_at: string
  house_id: string
  storage_path: string
  caption: string | null
  is_primary: boolean
  sort_order: number
  contributor_id: string | null
}

export type HouseStyle = 'Lowline' | 'Highline' | 'Split-level' | 'Other'
export type HouseCondition = 'Original' | 'Renovated' | 'At Risk' | 'Demolished'
```

## Build & Deployment

### Development
```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run dev -- --open # Start and open browser
```

### Building
```bash
npm run build        # Production build
npm run preview      # Preview production build locally
```

### Deployment Target
**Platform**: Vercel (free Hobby tier)
- Automatic HTTPS
- Global CDN
- Git-based deployments (push to main → live in ~60 seconds)
- Zero-config SvelteKit detection

**Adapter**: `@sveltejs/adapter-auto` — works with Vercel out of the box, no changes needed

### Environment Variables (set in Vercel dashboard)
| Variable | Description |
|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `PRIVATE_ADMIN_PASSWORD` | Password to access /admin |
| `PUBLIC_MAPBOX_TOKEN` | Mapbox public token for maps |

See `.env.example` for reference.

## Performance Considerations

### Images
- **Critical**: Compress before upload
- Target: <500KB per image
- Format: WebP preferred
- Implement compression in submission form
- Use Supabase storage transforms (TODO: configure)

### Database Queries
- Indexes already created on common filters (suburb, style, status)
- Use `.select('*')` sparingly - only fetch needed columns
- Implement pagination for large result sets (TODO)

### Bundle Size
- Avoid heavy dependencies
- Use dynamic imports for large components
- Tree-shake unused Tailwind classes (automatic in v4)

## Testing Strategy

### Manual Testing (Current)
- Test on Chrome, Firefox, Safari
- Test on mobile viewports
- Verify form submissions
- Check image uploads

### Automated Testing (TODO)
- Vitest installed but not configured
- Unit tests for utility functions
- Component tests for key interactions
- E2E tests with Playwright (future)

## Security

### Row Level Security (RLS)
All tables have RLS enabled. Policies:
- Public reads published content
- Authenticated users can submit (creates pending records)
- Admin approval required before publishing (TODO: admin interface)

### Authentication
- Using Supabase Auth
- Currently: No login required for browsing
- Login required for: Submissions (TODO: implement)
- Admin access: TODO (separate admin users table?)

### Input Validation
- Client-side: HTML5 validation + TypeScript
- Server-side: Supabase RLS + constraints
- TODO: Add more robust server-side validation

## Known Issues & TODOs

### Current Issues
1. Submission form styling needs Tailwind Forms integration
2. No house detail page yet
3. No admin moderation interface
4. No image compression pipeline
5. No authentication flow implemented

### Technical Debt
- [ ] Add proper error boundaries
- [ ] Implement loading skeletons
- [ ] Add toast notifications for actions
- [ ] Setup automated tests
- [ ] Configure image compression
- [ ] Add rate limiting on submissions
- [ ] Implement pagination on house list

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type checking
npm run check

# Linting
npm run lint

# Format code
npm run format

# Run tests (TODO: configure)
npm run test

# Build for production
npm run build

# Preview production build
npm run preview
```

## MCP Servers

Two MCPs configured in Cursor settings:

1. **SvelteKit MCP**: Query for latest SvelteKit 5 patterns
2. **Supabase MCP**: Verify Supabase API usage and best practices

**Use these** to verify you're using current patterns, as SvelteKit changes frequently.

## Debugging

### Common Issues

**"Module not found" errors**:
- Run `npm install`
- Restart dev server
- Check import paths

**Supabase errors**:
- Verify .env.local has correct credentials
- Check RLS policies in Supabase dashboard
- Confirm table/column names match schema

**Tailwind not working**:
- Verify `@import 'tailwindcss'` in layout.css
- Restart dev server after config changes
- Check browser console for CSS errors

**Type errors**:
- Run `npm run check` for details
- Verify types in src/lib/types/index.ts
- Check Supabase query return types

## Resources

- **SvelteKit Docs**: https://svelte.dev/docs/kit
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind v4 Docs**: https://tailwindcss.com/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

## Notes for AI Agents

- Always use TypeScript strict mode
- Query MCPs before implementing new patterns
- Follow existing code style
- Prioritize performance and cost efficiency
- Mobile-first responsive design
- Accessibility is non-negotiable
