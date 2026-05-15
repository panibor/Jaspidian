# Security policy

## Supported versions

Only the latest released version of Jaspidian is supported. There is no LTS line.

| Version | Supported |
|---|---|
| 1.0.x   | ✅ |
| < 1.0   | ❌ |

## Reporting a vulnerability

If you find a security issue — a way to make the extension read content from outside Facebook, a way to make the Obsidian plugin write outside the configured vault, an unauthenticated network call, anything that could leak personal data — **please do not open a public issue.**

Instead, use one of these private channels:

1. **GitHub's private vulnerability reporting** — go to the [Security tab](https://github.com/panibor/Jaspidian/security) of this repo and click "Report a vulnerability". Only the maintainer sees it.
2. **Email** — open an issue with the label `security` describing the *type* of issue (without the technical details) and ask the maintainer to email you. The maintainer will reach out.

Please include:

- What the issue is, in plain language
- A minimum reproducer if you have one
- The version you tested against (`v1.0.0`, etc.)
- Your assessment of impact (e.g. "any website can read the user's vault path", "any tab can POST to the plugin", etc.)

## What to expect

Jaspidian is a personal project maintained by a single person. There is no service-level agreement on response time. Realistic timing:

- Acknowledgement: within 7 days
- Triage and fix decision: within 30 days
- Patch release for confirmed issues: as soon as a fix lands; tagged as `vX.Y.Z` on the [Releases page](https://github.com/panibor/Jaspidian/releases)

Once a patch ships, an advisory will be published on the Security tab listing the affected versions and the fix.

## Out of scope

The following are **not** in scope and will be closed if reported:

- Facebook UI changes that break extraction (these are bugs, not security issues — open a regular issue)
- The user choosing to send their notes to OpenRouter or another cloud AI provider (this is opt-in by design — see [PRIVACY.md](PRIVACY.md))
- Privacy of *other people's* Facebook posts the user chooses to save (the user is responsible for what they capture — see [DISCLAIMER.md](DISCLAIMER.md))
- Anything that requires the attacker to already have local access to the user's machine

## Thank you

Jaspidian is small and noncommercial. Anyone who takes the time to investigate and disclose responsibly is genuinely appreciated.
