# Working with Cursor AI - Best Practices Guide

## Getting Started

### 1. Copy Context Files to Your Project

Copy these files from `/home/claude/` to your `ps-directory` root:

```bash
cp /home/claude/PROJECT_CONTEXT.md ~/Desktop/ps-directory/
cp /home/claude/AGENTS.md ~/Desktop/ps-directory/
cp /home/claude/TECH_STACK.md ~/Desktop/ps-directory/
cp /home/claude/TASKS.md ~/Desktop/ps-directory/
```

These files give Cursor/Claude all the context it needs.

### 2. Add to .cursorrules (Optional but Recommended)

Create `.cursorrules` in your project root:

```
Always read PROJECT_CONTEXT.md for business logic and design philosophy.
Read AGENTS.md for coding standards and development workflow.
Check TASKS.md for current priorities before starting new work.
Reference TECH_STACK.md for technical implementation details.

Use the SvelteKit and Supabase MCPs to verify latest best practices.

Maintain the mid-century modernist aesthetic in all UI work.
Prioritize mobile-first responsive design.
Keep costs within free tier limits (optimize images, efficient queries).
```

## How to Communicate with Cursor AI

### ✅ Good Prompts

**Specific Task with Context**:
```
Please implement Task #2 from TASKS.md - Create the house detail page.
Follow the technical requirements in TECH_STACK.md.
Use the House and Image types from src/lib/types/index.ts.
Match the modernist aesthetic described in PROJECT_CONTEXT.md.
```

**Feature Request with Requirements**:
```
Add pagination to the homepage house grid:
- Show 20 houses per page
- Add prev/next buttons at bottom
- Update URL with page parameter (?page=2)
- Maintain filter state across pages
- Style buttons to match our modernist design
- Check SvelteKit MCP for current pagination patterns
```

**Bug Fix with Details**:
```
The submission form's image upload is failing. When I select files:
1. Console shows: [error message]
2. Network tab shows: [status]
3. Expected: images upload to house-images bucket
4. Actual: request fails

Please debug and fix, checking Supabase MCP for correct storage API usage.
```

### ❌ Avoid Vague Prompts

**Too Vague**:
```
"Make the site look better"
"Fix the form"
"Add some features"
```

**Better**:
```
"Improve the homepage house cards: increase spacing between cards, make the suburb text bolder, add subtle hover effect"
"Fix the submission form styling to match our modernist aesthetic - see AGENTS.md for design principles"
"Implement the 'Near Me' feature from TASKS.md section 8"
```

## Workflow Patterns

### Starting a New Feature

1. **Reference the task**:
   ```
   I want to work on Task #4 from TASKS.md - Image Optimization Pipeline.
   Please review the requirements and suggest an implementation approach.
   ```

2. **Let AI propose a plan**:
   ```
   Before implementing, please:
   1. Outline the approach (which libraries, where to add code)
   2. Identify any dependencies or decisions needed
   3. Estimate complexity
   ```

3. **Implement iteratively**:
   ```
   Let's start with the server-side compression endpoint.
   Then we'll update the submission form to use it.
   ```

### Debugging Issues

1. **Provide context**:
   ```
   When I submit the form, I get this error: [paste error]
   The form is in src/routes/submit/+page.svelte
   I'm using Supabase client from src/lib/supabase.ts
   
   Please diagnose and fix.
   ```

2. **Share relevant code**:
   ```
   Here's the problematic code:
   [paste code block]
   
   It should [expected behavior] but instead [actual behavior].
   ```

### Refining Design

1. **Reference design principles**:
   ```
   The navigation bar needs to match our mid-century modern aesthetic better.
   See PROJECT_CONTEXT.md "Design Philosophy" section.
   
   Please update to:
   - Use bold sans-serif typography
   - Increase whitespace
   - Make it feel more brutalist/minimal
   ```

2. **Iterate on feedback**:
   ```
   Better, but the spacing is still too tight. 
   Add more padding (at least 2rem on desktop, 1rem mobile).
   Also make the logo/title bolder.
   ```

## Leveraging MCP Servers

### When to Query MCPs

**SvelteKit MCP** - Use for:
- "Check SvelteKit MCP: what's the current best practice for form actions?"
- "Query SvelteKit MCP: how should I handle authentication in SvelteKit 5?"
- "Verify with SvelteKit MCP: is this the right way to use load functions?"

**Supabase MCP** - Use for:
- "Check Supabase MCP: correct syntax for uploading to storage?"
- "Query Supabase MCP: how to implement RLS policies for this use case?"
- "Verify with Supabase MCP: is this the right way to join tables?"

### Example Usage

```
I'm implementing image upload to Supabase storage.
Before I start, please query the Supabase MCP to confirm:
1. Correct API for file uploads
2. How to handle upload progress
3. Best practices for error handling

Then implement based on the most current patterns.
```

## Managing Complexity

### Break Down Large Tasks

**Instead of**:
```
"Build the entire house detail page"
```

**Try**:
```
"Let's build the house detail page in steps:
1. First, create the route and load house data
2. Then add the hero image and gallery
3. Then add the info section
4. Finally add the map embed

Let's start with step 1."
```

### Review Before Committing

```
Before I commit this, please review for:
- Any obvious bugs
- Performance issues
- Accessibility concerns
- Matches our coding standards in AGENTS.md
```

## Common Scenarios

### Scenario 1: Starting Your Work Day

```
Good morning! I'm ready to continue working on Project Sydney.
Please review TASKS.md and tell me:
1. What's the highest priority incomplete task?
2. Are there any blockers or dependencies?
3. What should I focus on today?
```

### Scenario 2: Stuck on Something

```
I'm stuck on [specific issue].
I've tried:
- [approach 1]
- [approach 2]

Neither worked because [reason].

Can you:
1. Suggest alternative approaches
2. Check if there's a better pattern in SvelteKit/Supabase MCPs
3. Help me debug
```

### Scenario 3: Design Feedback

```
I've implemented [feature] but it doesn't feel quite right aesthetically.
Looking at PROJECT_CONTEXT.md design principles, I think it needs:
- [specific change 1]
- [specific change 2]

Please refine the design to better match our mid-century modern aesthetic.
```

### Scenario 4: Need Business Context

```
I'm implementing [feature] but I'm not sure about [business logic question].
Can you check PROJECT_CONTEXT.md and help me understand:
1. What's the business goal here?
2. How should this work from user perspective?
3. Any legal/privacy considerations?
```

## Tips for Success

### DO:
✅ Reference context files frequently
✅ Ask for MCP verification on new patterns
✅ Break complex tasks into steps
✅ Provide specific error messages
✅ Request code reviews
✅ Iterate on design feedback
✅ Update TASKS.md as you complete items

### DON'T:
❌ Ask to rebuild everything from scratch
❌ Make vague requests
❌ Ignore the context files
❌ Assume AI knows latest APIs (use MCPs)
❌ Skip testing on mobile
❌ Add dependencies without considering cost
❌ Forget about accessibility

## Handling AI Mistakes

### If Code Doesn't Work

```
This implementation isn't working. Error: [paste error]

Let's debug:
1. Check the error message
2. Verify we're using current SvelteKit 5 patterns (query MCP)
3. Test simpler version first
4. Add better error handling

Please fix and explain what went wrong.
```

### If Design Misses the Mark

```
This design doesn't match our aesthetic. 
Compare it to the principles in PROJECT_CONTEXT.md.

Specifically:
- Not enough whitespace
- Typography isn't bold enough
- Feels too modern, need more brutalist

Please revise to match our mid-century modern style better.
```

## Keeping Track

### Mark Completed Tasks

When you finish a task, ask AI to update TASKS.md:

```
We've completed Task #2 (House Detail Page).
Please update TASKS.md:
1. Mark task #2 as complete [x]
2. Note any issues or follow-ups
3. Suggest what to work on next
```

### Document Decisions

```
We decided to use Mapbox instead of Google Maps because [reason].
Please note this in TECH_STACK.md under "Map View Integration".
```

## Getting Unstuck

If you're unclear on what to do next:

```
I'm not sure what to prioritize. Can you:
1. Review TASKS.md
2. Check what's blocking other tasks
3. Suggest the most valuable thing to work on now
4. Explain why that's the best choice
```

## Final Tips

1. **Trust but verify**: AI is helpful but not infallible. Test everything.

2. **Iterate**: Don't expect perfection first try. Refine iteratively.

3. **Be specific**: The more context and detail you provide, the better results.

4. **Use context files**: They're your source of truth. Reference them often.

5. **Check MCPs**: Don't assume training data is current. Verify with MCPs.

6. **Stay focused**: Work on one clear task at a time.

7. **Keep it simple**: Don't over-engineer. MVP first, polish later.

8. **Mobile first**: Always consider mobile UX.

9. **Ask questions**: If something's unclear, ask before implementing.

10. **Have fun**: This is a cool project about beautiful architecture!

---

## Quick Reference

**To start a task**: "Let's work on Task #[N] from TASKS.md"

**To debug**: "This error is happening: [error]. Code is in [file]. Please fix."

**To refine design**: "This needs to match our aesthetic better - see PROJECT_CONTEXT.md design section"

**To verify pattern**: "Check [MCP] for current best practice on [topic]"

**To review**: "Please review this code for bugs, performance, and accessibility"

**To update docs**: "Please update [file] with [information]"

Good luck building Project Sydney! 🏠✨
