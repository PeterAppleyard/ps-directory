# Setting Up Your Cursor Workspace

## Step 1: Copy Context Files

From your terminal in the `ps-directory` folder, run:

```bash
# If the Claude files are in /home/claude, copy them:
cp /home/claude/PROJECT_CONTEXT.md .
cp /home/claude/AGENTS.md .
cp /home/claude/TECH_STACK.md .
cp /home/claude/TASKS.md .
cp /home/claude/CURSOR_GUIDE.md .
```

Or download them from wherever they were created and place them in your `ps-directory` root.

## Step 2: Create .cursorrules File

Create a file called `.cursorrules` in your project root:

```bash
touch .cursorrules
```

Add this content:

```
Always read PROJECT_CONTEXT.md for business logic and design philosophy.
Read AGENTS.md for coding standards and development workflow.
Check TASKS.md for current priorities before starting new work.
Reference TECH_STACK.md for technical implementation details.

Use the SvelteKit and Supabase MCPs to verify latest best practices.

Maintain the mid-century modernist aesthetic in all UI work.
Prioritize mobile-first responsive design.
Keep costs within free tier limits (optimize images, efficient queries).

When asked about Project Sydney, always reference these context files first.
```

## Step 3: Update .gitignore

Make sure your `.gitignore` includes:

```bash
# Environment variables
.env
.env.local

# Build output
.svelte-kit/
build/
dist/

# Dependencies
node_modules/

# IDE
.vscode/
.cursor/

# OS
.DS_Store
```

## Step 4: Commit Context Files

These context files should be committed to git (they don't contain secrets):

```bash
git add PROJECT_CONTEXT.md AGENTS.md TECH_STACK.md TASKS.md CURSOR_GUIDE.md .cursorrules
git commit -m "Add AI context documentation"
```

## Step 5: Verify MCP Configuration

In Cursor:
1. Open Settings (Cmd/Ctrl + ,)
2. Go to "Features" > "MCP"
3. Verify you see:
   - SvelteKit MCP
   - Supabase MCP

If not, you may need to configure them in your Cursor settings.

## Step 6: Test the Setup

Open Cursor and try this prompt:

```
Please read PROJECT_CONTEXT.md and TASKS.md, then tell me:
1. What is Project Sydney?
2. What's the highest priority task right now?
3. What should I focus on first?
```

If Claude can answer these questions, your setup is working!

## Your Project Structure Should Look Like:

```
ps-directory/
├── .cursorrules              # AI instructions
├── .env.local               # Your secrets (gitignored)
├── .gitignore
├── PROJECT_CONTEXT.md       # Business context
├── AGENTS.md                # AI agent instructions
├── TECH_STACK.md            # Technical documentation
├── TASKS.md                 # Prioritized task list
├── CURSOR_GUIDE.md          # How to work with Cursor
├── package.json
├── svelte.config.js
├── tsconfig.json
├── src/
│   ├── lib/
│   │   ├── components/
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── supabase.ts
│   └── routes/
│       ├── +layout.svelte
│       ├── +page.svelte
│       ├── +page.ts
│       ├── layout.css
│       └── submit/
│           └── +page.svelte
└── static/
```

## Ready to Start!

Now you can work with Cursor using prompts like:

- "Let's work on Task #1 from TASKS.md - fix the submission form styling"
- "Please implement the house detail page as specified in TASKS.md"
- "Review the current homepage and suggest improvements based on our design philosophy"

Read CURSOR_GUIDE.md for detailed examples of how to communicate effectively with the AI.

## Troubleshooting

**If Cursor doesn't seem to know about context files:**
- Make sure files are in project root
- Try explicitly: "Please read PROJECT_CONTEXT.md first, then..."
- Restart Cursor

**If MCPs aren't working:**
- Check Cursor settings
- Verify MCP servers are enabled
- Try restarting Cursor

**If code quality is inconsistent:**
- Reference AGENTS.md explicitly in prompts
- Ask for code reviews before committing
- Iterate on feedback

Good luck! 🚀
