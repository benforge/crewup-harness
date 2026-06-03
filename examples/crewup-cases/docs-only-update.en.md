# Documentation-Only Update Case

Copy this into the chat window:

```text
Use CrewUp to update project documentation only. Add README and docs coverage for installation, API keys, subagent workflow, and local testing. Do not change business code. After the docs change, tester should check links and command consistency, and reviewer should check clarity and misleading claims.
```

Expected focus:

- unrelated implementation agents such as backend/database should not start
- docs agent owns documentation changes
- tester checks links, commands, and consistency
- reviewer checks risks and omissions

Check commands:

```bash
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
```
