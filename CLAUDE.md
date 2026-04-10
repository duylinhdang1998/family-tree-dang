## gstack (REQUIRED — vendored as git submodule)

gstack is vendored into this repo at `.claude/skills/gstack/` as a git submodule.
It is NOT installed globally — this repo is the only place gstack lives on your machine.

**Before doing ANY work, verify gstack is present:**

```bash
test -d .claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING (fresh clone without submodules), run:

```bash
git submodule update --init --recursive
```

If still missing after that, tell the user the submodule is broken and stop.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: skills like /qa, /ship, /review, /investigate, and /browse
are available via the Skill tool. Use /browse for all web browsing.
Use `.claude/skills/gstack/...` for gstack file paths (project-local, not global).

To upgrade gstack:

```bash
cd .claude/skills/gstack && git pull origin main
cd ../../.. && git add .claude/skills/gstack && git commit -m "chore: bump gstack submodule"
```

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
