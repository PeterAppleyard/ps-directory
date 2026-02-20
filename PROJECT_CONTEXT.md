# Project Sydney (P&S Directory)

## Project Overview
A digital directory and archive of houses built by Pettit & Sevitt, an iconic mid-century modern project home developer in Sydney, Australia (1950s-1980s).

**Database Name**: `pands` (Supabase project)
**Tech Stack**: SvelteKit 5 + TypeScript + Supabase + Tailwind CSS v4

## Business Context

### What is Pettit & Sevitt?
- Australian project home developer (1950s-1980s)
- Pioneered affordable mid-century modernist homes
- Part of the "Sydney School" architectural movement
- Known for distinctive styles: Lowline, Highline, Split-level
- Marketing featured iconic black & white photography by Max Dupain
- Advertisements are considered advertising classics

### Project Goals
1. **Archival**: Document all P&S homes before they're lost to demolition/renovation
2. **Educational**: Teach people about mid-century Australian architecture
3. **Community**: Connect P&S owners and enthusiasts
4. **Preservation**: Raise awareness of heritage value

### Target Audience
- Current P&S homeowners
- Architecture enthusiasts
- Heritage advocates
- Real estate agents specializing in mid-century homes
- Researchers and academics

## Design Philosophy

### Visual Aesthetic
**Inspired by Original P&S Advertising (1960s-70s)**
- Bold sans-serif typography (Helvetica, condensed fonts)
- High-contrast black & white photography
- Generous whitespace
- Brutalist/modernist grid layouts
- Minimal color palette (black/white + single accent)
- Dramatic angles and perspectives
- Clean geometric layouts

**Reference**: Look at Max Dupain's architectural photography

### Key Design Principles
- Image-led storytelling
- Strong typographic hierarchy
- Purposeful negative space
- No clutter or unnecessary decoration
- Mobile-first but optimized for desktop browsing
- Fast loading (architecture photos can be large)

## Technical Architecture

### Database Schema (Supabase)

**houses table:**
- Core location data (street, suburb, state, postcode, lat/long)
- Architectural details (style, year_built, builder_name)
- Status tracking (condition, status, verification)
- Metadata (contributor_id, verified_by, verification_notes)

**images table:**
- Links to houses (house_id FK)
- Storage paths to Supabase Storage
- Display order (is_primary, sort_order)
- Attribution (caption, contributor_id)

**Key Constraints:**
- status: 'pending' | 'published' | 'rejected' (pending by default)
- Only 'published' houses visible to public
- Row Level Security (RLS) enabled
- Public can read published data
- Authenticated users can submit (creates 'pending' records)

### Storage
- Bucket: `house-images` (public)
- Store user-uploaded photos here
- Reference via storage_path in images table

### Environment Variables
```
PUBLIC_SUPABASE_URL=<your_url>
PUBLIC_SUPABASE_ANON_KEY=<your_key>
```

## Feature Roadmap

### MVP (Current Phase)
- [x] Database schema
- [x] Basic homepage with house grid
- [x] Filter by suburb and style
- [ ] House detail page with gallery
- [ ] Submission form (IN PROGRESS - forms styling needs work)
- [ ] About/History section

### Phase 2 - Core Features
- [ ] Google Maps integration on house detail pages
- [ ] Admin moderation dashboard
- [ ] Image optimization pipeline (compress on upload)
- [ ] "Near Me" discovery (location-based filtering)
- [ ] Search functionality

### Phase 3 - Community Features
- [ ] User accounts (optional)
- [ ] Favorites/Collections
- [ ] "Status tracking" (mark houses as At Risk, Demolished, etc)
- [ ] Community verification system

### Phase 4 - Advanced Features
- [ ] Street View time machine integration
- [ ] Pattern library / Field guide (identify P&S features)
- [ ] Statistics dashboard
- [ ] Walking tour generator
- [ ] Timeline visualization of P&S history

### Nice-to-Haves
- [ ] "Is this P&S?" AI checker (funnel to Facebook group)
- [ ] Demolished houses memorial section
- [ ] Comparison mode (view two houses side-by-side)
- [ ] Export capabilities for researchers
- [ ] Original owners oral history section

## Content Strategy

### House Styles to Track
- **Lowline**: Single-story, low-pitched roof, horizontal emphasis
- **Highline**: Two-story, steep rooflines, vertical elements
- **Split-level**: Multi-level design responding to sloping sites
- **Other**: Variations and experimental designs

### House Conditions
- **Original**: Largely unmodified from original design
- **Renovated**: Sympathetically updated while respecting design
- **At Risk**: Under threat of demolition or unsympathetic renovation
- **Demolished**: No longer exists (memorial/archive only)

### Suburbs to Focus On (High P&S Concentration)
- Seaforth
- Castlecrag
- Balgowlah Heights
- Forestville
- Frenchs Forest
- Northbridge
- Other North Shore suburbs

## External Integrations & Resources

### Data Sources
- **Domain/REA**: Link to property listings (don't scrape)
- **Google Maps**: Embed maps, use Street View
- **Powerhouse Museum**: P&S archive (seek image permissions)
- **Trove (NLA)**: Historical newspaper ads
- **State Library NSW**: Archival materials

### Community Connections
- **Facebook Group**: "Pettit and Sevitt Owners and Friends Club"
  - Use for community discussion/identification
  - Don't compete with it - complement it
  - Funnel "Is this P&S?" questions there
  - Your site = verified archive, Facebook = active discussion

### Partnerships to Explore
- Architecture schools/programs
- Heritage organizations
- Sydney Living Museums
- Real estate agents (mid-century specialists)

## Legal Considerations

### What We CAN Do
- Photograph houses from public streets
- Link to real estate archives (Domain, REA)
- Reference sale prices/dates (public record)
- Use P&S name for factual reference (nominative use)
- Link to P&S logo in historical/educational context

### What We CANNOT Do
- Use P&S logo as our brand (trademark issues)
- Reproduce copyrighted floor plans without permission
- Show full addresses without considering owner privacy
- Reproduce song lyrics, poems (complete creative works)
- Use Max Dupain photos without estate permission

### Best Practices
- Clear disclaimer: "Independent community project, not affiliated with P&S"
- Privacy policy with takedown process
- Contributor license agreement (who owns uploaded photos)
- Consider showing only suburb, not full street number
- Always attribute sources when linking

## Cost Management Strategy

### Keeping It Free/Low-Cost
**Hosting**: Vercel (free Hobby tier — automatic deploys from GitHub)
**Database**: Supabase (free tier: 500MB DB, 1GB storage)
**Images**: Supabase Storage (free tier: 1GB, images compressed to WebP on upload)
**Maps**: Mapbox (free tier: 50k loads/month)
**Target**: $0-20/year initially (domain name only)

### Image Optimization Critical
- Max upload size: 2MB per image
- Compress on upload (WebP format)
- Max 5 images per house
- Keep total storage under 1GB initially

### Scale Gracefully
- Link out to external sources (don't store redundant data)
- Use external APIs (Google Maps, property data)
- Progressive image loading
- No CDN needed initially (Vercel handles it)

## Monetization (If Needed Later)
**Preferred**: Grant funding, donations (no ads)
- Heritage preservation grants
- Community Patreon ($5/month supporters)
- Architecture organization partnerships
- "Buy me a coffee" button

**Avoid**: Display ads (ruins aesthetic and user experience)

## Success Metrics

### Short-term (6 months)
- 100+ verified houses documented
- Active community submissions
- Partnership with P&S Facebook group
- Media coverage (architecture blogs, SMH)

### Long-term (2 years)
- 500+ houses documented
- Recognized as authoritative P&S resource
- Used by researchers, real estate agents
- Influenced heritage listings
- Self-sustaining through grants/donations

## Brand Identity

### Name: "Project Sydney"
- References "project homes" (what P&S built)
- "Project" = ongoing documentation effort
- Sydney = regional specificity
- Monogram: PS (inverted homage to P&S logo)

### Tagline Options
- "Documenting mid-century project homes"
- "A directory of Pettit & Sevitt homes"
- "The architecture of optimism"

### Voice & Tone
- Knowledgeable but accessible
- Enthusiastic about architecture
- Respectful of heritage
- Community-oriented
- Not academic/stuffy

## Key Unknowns / Questions

### Technical
- [ ] Geocoding addresses to lat/long (Google API? Batch process?)
- [ ] Image compression pipeline (sharp.js? Cloudflare Images?)
- [ ] Search implementation (PostgreSQL full-text? Separate service?)

### Content
- [ ] How to verify a house is actually P&S? (Checklist of features?)
- [ ] Complete style taxonomy (are there more than Lowline/Highline/Split?)
- [ ] Which builders did P&S use? (Names for database)

### Legal
- [ ] Can we get Powerhouse Museum image licenses?
- [ ] Who owns P&S trademark/IP now?
- [ ] What's the best privacy approach for addresses?

### Community
- [ ] Will Facebook group admin collaborate?
- [ ] Are there P&S experts willing to verify submissions?
- [ ] Interest from heritage organizations?

## Next Steps Priority

1. **Fix submission form styling** (Tailwind v4 forms)
2. **Create house detail page** (gallery, map, all info)
3. **Build About/History section** (P&S story, style guide)
4. **Add test data** (10-20 sample houses to show functionality)
5. **Admin moderation interface** (approve/reject pending submissions)
6. **Image optimization** (implement compression on upload)
7. **Google Maps integration** (detail page + map view)
8. **Soft launch to Facebook group** (get feedback, initial content)

## Resources & References

### Research
- Powerhouse Museum P&S archive
- Max Dupain photography collection
- Piper Press upcoming book (2025)
- Sydney Living Museums

### Design Inspiration
- Original P&S newspaper ads (1960s-70s)
- Max Dupain architectural photography
- Brutalist web design
- Mid-century modern typography

### Technical Docs
- SvelteKit 5: https://svelte.dev/docs/kit
- Supabase: https://supabase.com/docs
- Tailwind v4: https://tailwindcss.com/docs
