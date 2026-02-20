# Project Sydney - Task List

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

**Route**: `src/routes/house/[id]/+page.svelte` and `+page.ts`

**Tasks**:
- [ ] Create route with dynamic [id] parameter
- [ ] Load house data from Supabase in +page.ts
- [ ] Load associated images from images table
- [ ] Display hero image (primary image)
- [ ] Show image gallery (remaining images)
  - [ ] Implement lightbox/modal for full-size viewing
  - [ ] Add prev/next navigation in gallery
- [ ] Display house information:
  - [ ] Address (consider privacy - maybe just suburb?)
  - [ ] Style, year, builder
  - [ ] Description
  - [ ] Condition
- [ ] Add Google Maps embed showing location
- [ ] Link back to main listing page
- [ ] Add share functionality (copy link, social media?)
- [ ] Mobile-responsive layout

**Dependencies**:
- Google Maps API key (or Mapbox alternative)
- Decision on address privacy (show full or partial?)

**Acceptance Criteria**:
- All house details displayed clearly
- Images are prominent and clickable
- Map shows location accurately
- Looks great on mobile and desktop
- Fast loading

### 3. Create About/History Section
**Status**: Not Started
**Priority**: MEDIUM
**Description**: Educational content about Pettit & Sevitt

**Route**: `src/routes/about/+page.svelte`

**Content Needed** (from business owner):
- [ ] P&S company history
- [ ] Timeline of key projects/milestones
- [ ] Explanation of different house styles
- [ ] Photos/scans of original advertisements
- [ ] Information about Sydney School movement
- [ ] Preservation context

**Tasks**:
- [ ] Create page structure with sections
- [ ] Implement responsive timeline component
- [ ] Add style comparison section (Lowline vs Highline vs Split-level)
- [ ] Include original ad imagery (once sourced/licensed)
- [ ] Write copy (business owner to provide)
- [ ] Add "Learn More" resources section
- [ ] Link to external resources (Powerhouse Museum, etc)

**Acceptance Criteria**:
- Educational and engaging
- Visually interesting (use archival imagery)
- Matches site aesthetic
- Mobile-friendly reading experience

## 🎯 Core Features (Next 2 Weeks)

### 4. Image Optimization Pipeline
**Status**: ✅ Complete
**Priority**: HIGH
**Description**: Compress images on upload to save storage costs

**Why Critical**: User uploads could quickly exceed 1GB free tier

**Tasks**:
- [ ] Install sharp or similar image processing library
- [ ] Create server-side endpoint for upload processing
- [ ] Compress images to WebP format
- [ ] Resize to max 2000px width
- [ ] Target file size: <500KB per image
- [ ] Generate thumbnails for grid view (400px)
- [ ] Update submission form to use processing endpoint
- [ ] Add progress indicator during upload
- [ ] Handle errors gracefully

**Acceptance Criteria**:
- Images compressed without visible quality loss
- Storage usage minimized
- Upload process clear to users
- Works reliably

### 5. Admin Moderation Dashboard
**Status**: ✅ Complete
**Priority**: HIGH
**Description**: Interface to approve/reject pending house submissions

**Route**: `src/routes/admin/+page.svelte`

**Tasks**:
- [ ] Create admin route (protected)
- [ ] Implement simple admin authentication
  - [ ] Option A: Use Supabase Auth with admin role
  - [ ] Option B: Simple password protection via environment variable
- [ ] List all pending houses
- [ ] Show house details + images
- [ ] Add approve/reject buttons
- [ ] Update house status in database
- [ ] Add verification notes field
- [ ] Include bulk actions (approve/reject multiple)
- [ ] Send email notification to contributor (optional)

**Acceptance Criteria**:
- Only authorized user can access
- Can review submissions efficiently
- Clear approve/reject workflow
- Changes reflected immediately

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
**Status**: Not Started
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
**Status**: Ongoing
**Priority**: MEDIUM

**Tasks**:
- [ ] Implement image lazy loading
- [ ] Add pagination to house list (20-30 per page)
- [ ] Optimize database queries (only fetch needed columns)
- [ ] Add caching headers
- [ ] Minimize JavaScript bundle
- [ ] Optimize Tailwind CSS (already good in v4)
- [ ] Run Lighthouse audits and address issues

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
**Status**: Not Started
**Owner**: Business Owner

**Tasks**:
- [ ] Source and add 50-100 initial houses
- [ ] Get high-quality photos for seed data
- [ ] Write About section content
- [ ] Gather historical P&S advertisements
- [ ] Create style guide content (identifying features)
- [ ] Prepare launch announcement
- [ ] Coordinate with Facebook group admins

### 13. Legal & Compliance
**Status**: Not Started
**Owner**: Business Owner with AI assistance

**Tasks**:
- [ ] Write privacy policy
- [ ] Write terms of service
- [ ] Create contributor license agreement
- [ ] Add takedown request process
- [ ] Add disclaimers (independent project, not affiliated)
- [ ] Confirm image permissions for historical materials
- [ ] Research P&S trademark status

### 14. Deployment
**Status**: Not Started
**Priority**: When ready for launch
**Platform**: Vercel

**Tasks**:
- [ ] Create Vercel account at vercel.com (free Hobby tier)
- [ ] Push code to GitHub repository
- [ ] Import GitHub repo in Vercel dashboard
- [ ] Add environment variables in Vercel project settings:
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `PRIVATE_ADMIN_PASSWORD`
  - `PUBLIC_MAPBOX_TOKEN`
- [ ] Verify preview deployment works
- [ ] Setup custom domain (projectsydney.com.au?)
- [ ] SSL is automatic — no action needed
- [ ] Test production build end-to-end
- [ ] Setup Vercel Analytics (free) or leave for now

**Notes**:
- No adapter changes needed — `@sveltejs/adapter-auto` works with Vercel
- Every push to `main` branch auto-deploys
- PRs get preview URLs automatically

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
1. Submission form styling incomplete
2. No loading indicators on data fetch
3. No error handling for failed Supabase queries
4. Images not optimized (storage concern)

### Technical Debt
- [ ] Add error boundaries
- [ ] Implement proper logging
- [ ] Add rate limiting on submissions
- [ ] Better TypeScript coverage
- [ ] Add JSDoc comments to complex functions
- [ ] Refactor duplicated code

## 📝 Notes

### Decision Needed
- **Maps provider**: Google vs Mapbox?
- **Address privacy**: Show full address or just suburb?
- **Authentication**: Full user accounts or simpler approach?
- **Admin access**: Separate admin table or simple password?

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
