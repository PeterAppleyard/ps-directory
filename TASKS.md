# PS Archive - Task List

## ⚠️ Pre-Launch Blockers (Must Do Before Going Public)

### 🔴 SEO — Remove noindex
**Status**: Intentionally blocked
**File**: `src/routes/+layout.svelte` — `<meta name="robots" content="noindex, nofollow" />`
**Action**: Remove this tag when site is ready for public launch and dummy content has been replaced with real data.
**Why it's there**: Site has placeholder/WIP content and sparse house listings — not ready to be indexed.

---

## 🔥 Immediate Priorities (This Week)

### 1. Fix Submission Form Styling
**Status**: ✅ Complete
**Priority**: HIGH
**Description**: Form exists but styling doesn't match site aesthetic

**Tasks**:
- [ ] Ensure @tailwindcss/forms plugin is properly loaded in layout.css
- [ ] Update form elements to use Tailwind v4 form styles
- [ ] Add bold labels with proper hierarchy
- [ ] Increase spacing between form fields (generous whitespace)
- [ ] Style submit button to match site's bold modernist aesthetic
- [ ] Add loading state (disable button, show spinner)
- [ ] Add success/error message display
- [ ] Test on mobile and desktop

**Acceptance Criteria**:
- Form looks clean and professional
- Matches mid-century modern aesthetic (bold, clean, spacious)
- Works smoothly on mobile
- Clear feedback for user actions

### 2. Create House Detail Page
**Status**: ✅ Complete
**Priority**: HIGH
**Description**: Individual page for each house showing all details

**Route**: `src/routes/house/[slug]/+page.svelte` and `+page.ts`

**Notes**:
- Route uses SEO-friendly slugs (e.g. `/house/west-pymble-todman-avenue`)
- UUID-based old URLs redirect 301 to slug URL automatically
- Full lightbox gallery, share button, stories section all implemented

### 3. Create About/History Section
**Status**: ✅ Complete (Mar 2026 — simplified editorial version)
**Priority**: LOW
**Description**: Two-section editorial page: verified P&S history + Pete's personal note

**Route**: `src/routes/about/+page.svelte`

**Implementation**:
- Section 01: Verified company history (founding, Woolley/Dysart, 3,500 homes, display villages, Sydney School, Don's Party)
- Section 02: Pete's personal statement about the archive's purpose
- Dark masthead with "Pettit+" Sevitt" branding (hairline Inter + for typographic effect)
- Pull quote: Woolley's real quote
- All unverified claims removed; Harry Seidler correctly noted as 1 exhibition home only

### 3b. SEO-Friendly Slug URLs
**Status**: ✅ Complete (Mar 2026)
**Priority**: HIGH
**Description**: Replace UUID-based house URLs with readable slugs

**Implementation**:
- `src/lib/utils/slug.ts` — `generateBaseSlug()`, `isUUID()` (client-safe)
- `src/lib/server/slug.ts` — `generateUniqueSlug()` with DB collision handling (appends -2, -3, etc.)
- Route `house/[slug]` handles slugs and UUID params (UUID → 301 redirect to slug)
- Slug stored in `houses.slug` column (UNIQUE, nullable for backfill compatibility)
- All URL references throughout app, emails, map, admin panel updated
- ✅ SQL migration complete — `slug` column live and all existing houses backfilled

---

## 🎯 Core Features (Next 2 Weeks)

### 4. Image Optimization Pipeline
**Status**: ✅ Complete
**Priority**: HIGH
**Description**: Compress images on upload to save storage costs

**Implementation**: Client-side via Canvas API in `src/lib/utils/compress.ts`
- Resizes to max 2000×2000px
- Converts to WebP format
- First pass at 0.85 quality; retries down to 0.6 until under 500KB
- Falls back to original if compression fails
- Progress indicator shown during upload ("Compressing 2 of 3…")
- No server-side dependency (no sharp needed)

### 5. Admin Moderation Dashboard
**Status**: ✅ Complete + Performance Optimised (Mar 2026)
**Priority**: HIGH
**Description**: Interface to approve/reject pending house submissions

**Route**: `src/routes/admin/+page.svelte`

**Completed this session**:
- ✅ Delete listing — server action cleans up storage + images + house row; buttons in listing row and edit panel
- ✅ Performance: all load queries parallelised with `Promise.all`; published house images no longer pre-fetched
- ✅ Optimistic UI: approve/reject/delete/setFeatured/approveStory/edit all update local state immediately — no more `invalidateAll()` on every button press (eliminated ~2s delay)
- ✅ Settings theme: fixed settings page save not applying to layout (added `$effect` to sync `data.theme`)
- ✅ Sidebar nav: "Pending Review", "Published", "Quick Add" links now actually switch tabs (`?tab=` query params)

### 6. House Search Functionality
**Status**: ✅ Complete
**Priority**: MEDIUM
**Description**: Allow users to search houses by address, suburb, or keywords

**Tasks**:
- [ ] Add search input to homepage
- [ ] Implement PostgreSQL full-text search
- [ ] Search across: suburb, street, style, description
- [ ] Update filter UI to include search
- [ ] Show "no results" state clearly
- [ ] Consider search suggestions/autocomplete (future)

**Acceptance Criteria**:
- Fast, relevant results
- Works well with existing filters
- Clear when no results found

## 📍 Location Features (Next Month)

### 7. Map View Integration
**Status**: ✅ Complete
**Priority**: MEDIUM
**Description**: Show houses on an interactive map

**Options**:
- Google Maps (requires API key, $200/month free credit)
- Mapbox (free tier: 50k loads/month)

**Tasks**:
- [ ] Choose map provider and get API key
- [ ] Create map view route: `src/routes/map/+page.svelte`
- [ ] Load house coordinates from database
- [ ] Display markers on map
- [ ] Add marker clustering for dense areas
- [ ] Click marker to show house popup
- [ ] Link to house detail page from popup
- [ ] Add map to individual house detail pages
- [ ] Style map to match site aesthetic (if possible)

**Acceptance Criteria**:
- Houses plotted accurately
- Smooth interaction
- Mobile-friendly
- Performs well with 100+ markers

### 8. "Near Me" Location-Based Discovery
**Status**: Not Started
**Priority**: LOW
**Description**: Find P&S houses near user's location

**Tasks**:
- [ ] Request user's geolocation permission
- [ ] Calculate distances from user to houses
- [ ] Add "Near Me" filter option
- [ ] Show radius slider (1km, 5km, 10km)
- [ ] Sort results by distance
- [ ] Display distance on house cards

**Acceptance Criteria**:
- Respects user privacy (asks permission)
- Accurate distance calculations
- Useful for architecture enthusiasts exploring

## 🎨 Polish & Enhancement (Ongoing)

### 9. Design Refinements
**Status**: Ongoing
**Priority**: MEDIUM

**Tasks**:
- [ ] Refine typography scale
- [ ] Add micro-interactions (hover states, transitions)
- [ ] Improve loading states (skeletons, spinners)
- [ ] Better error states with helpful messages
- [ ] Add toast notifications for actions
- [ ] Optimize for print (house detail pages)
- [ ] Consider dark mode (low priority)

### 10. Performance Optimization
**Status**: Partially complete
**Priority**: MEDIUM

**Tasks**:
- [ ] **Add pagination to house list** — currently fetches all records; needs 20–30 per page before launch (HIGH once house count grows)
- [ ] Implement image lazy loading
- [ ] Optimize database queries (only fetch needed columns)
- [ ] Add caching headers
- [ ] Minimize JavaScript bundle
- [ ] Run Lighthouse audits and address issues

**Completed this session**:
- ✅ Admin load queries parallelised (5 sequential → 2 parallel rounds)
- ✅ Admin optimistic UI (no full reload on every action)

## 🧪 Testing & Quality (Future)

### 11. Automated Testing
**Status**: Not Started
**Priority**: LOW (initially)

**Tasks**:
- [ ] Configure Vitest
- [ ] Write unit tests for utility functions
- [ ] Component tests for key interactions
- [ ] E2E tests with Playwright
- [ ] Setup CI/CD pipeline
- [ ] Add test coverage reporting

## 🚀 Pre-Launch (Before Public Release)

### 12. Content & Data
**Status**: Parked — owner to action when ready
**Owner**: Business Owner

**Tasks**:
- [ ] Source and add 50–100 initial houses
- [ ] Get high-quality photos for seed data
- [ ] Write About section content (page structure already exists)
- [ ] Gather historical P&S advertisements
- [ ] Create style guide content (identifying features)
- [ ] Prepare launch announcement
- [ ] Coordinate with Facebook group admins

### 13. Legal & Compliance
**Status**: Partially complete — parked for now
**Owner**: Business Owner with AI assistance

**Done**:
- ✅ Privacy policy page (`/privacy`)
- ✅ Takedown request form (`/takedown`) with Supabase table

**Remaining** (parked):
- [ ] Write terms of service
- [ ] Create contributor license agreement
- [ ] Add disclaimers (independent project, not affiliated)
- [ ] Confirm image permissions for historical materials
- [ ] Research P&S trademark status

### 14. Deployment
**Status**: ✅ Complete — live on Vercel
**Priority**: Done

**Notes**:
- Deployed to Vercel, auto-deploys on push to `main`
- Custom domain: `psvitt.com` (Cloudflare DNS → Vercel)
- Email: `noreply@send.psvitt.com` via Resend, reply-to `hello@psvitt.com`
- Auth redirect URLs configured for `psvitt.com` in Supabase

## 📊 Analytics & Monitoring (Post-Launch)

### 15. Usage Tracking
**Status**: Future

**Tasks**:
- [ ] Setup Vercel Analytics (free, privacy-friendly) or Plausible
- [ ] Track key metrics:
  - [ ] Page views
  - [ ] Popular houses
  - [ ] Common search terms
  - [ ] Submission rate
  - [ ] Bounce rate
- [ ] Monitor Supabase usage (approaching limits?)
- [ ] Track storage consumption

## 💡 Future Ideas (Backlog)

### Lower Priority Features
- [ ] User accounts (save favorites, track contributions)
- [ ] Comment system (or link to Facebook discussions?)
- [ ] "Similar houses" recommendations
- [ ] Walking tour generator
- [ ] Street View time machine integration
- [ ] Statistics dashboard
- [ ] Pattern library / field guide
- [ ] Export functionality (CSV, PDF reports)
- [ ] API for researchers
- [ ] Demolished houses memorial section
- [ ] Original owners oral history section
- [ ] Newsletter/email updates
- [ ] Mobile app (PWA would be sufficient)

### AI-Powered Features (Experimental)
- [ ] "Is this P&S?" image analyzer
- [ ] Architectural feature detection
- [ ] Automatic style classification
- [ ] Change detection (monitor for demolitions)

## 🐛 Known Issues

### Current Bugs
1. No pagination on house list — will become a performance issue as data grows
2. No loading indicators on data fetch (homepage)
3. No error handling for failed Supabase queries
4. ~~Slug DB migration~~ — ✅ done, `slug` column live and backfilled

### Technical Debt
- [ ] Add error boundaries
- [ ] Implement proper logging
- [ ] Add rate limiting on submissions
- [ ] Better TypeScript coverage
- [ ] Add JSDoc comments to complex functions
- [ ] Refactor duplicated code

## 📝 Notes

### Decisions Made
- **Maps provider**: ✅ Mapbox (free tier, 50k loads/month)
- **Address privacy**: ✅ Full address shown; street number displayed, no privacy issues raised
- **Authentication**: ✅ Supabase Auth with role-based access (`admin`, `super_admin`)
- **Admin access**: ✅ Role in `profiles` table; super_admin has full access
- **URL structure**: ✅ Slug-based URLs (e.g. `/house/west-pymble-todman-avenue`)
- **Email provider**: ✅ Resend, subdomain `send.psvitt.com`

### Pending Decision
- None currently

### Waiting On
- Business owner to source historical content (ads, photos, text)
- Powerhouse Museum image permissions response
- Facebook group admin collaboration confirmation

### Questions for Business Owner
1. What level of address detail should be public? (privacy concern)
2. Do you want user accounts or anonymous submissions?
3. Priority on "Near Me" vs other features?
4. Budget for Google Maps API if needed?
5. Timeline for soft launch to Facebook group?

---

## How to Use This File

**For AI Agents**:
- Start with 🔥 Immediate Priorities
- Work top to bottom within each section
- Mark tasks complete with [x] when done
- Add notes/blockers inline
- Reference PROJECT_CONTEXT.md for business logic
- Query MCPs for technical implementation details

**For Business Owner**:
- Review priorities - are they correct?
- Provide content/decisions where marked as "Owner"
- Flag any new urgent needs
- Add future ideas to backlog section
