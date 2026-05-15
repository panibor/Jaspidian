# Contributing to Jaspidian

Thanks for your interest. A few ground rules.

## Licence and personal-use scope

Jaspidian is licensed under [PolyForm Noncommercial 1.0.0](LICENSE). By submitting a pull request, an issue with patch code, or any other contribution, **you agree your contribution is licensed under the same terms** and may be redistributed by the project under that licence.

If you cannot agree to this, please do not submit code.

Jaspidian is a personal-use tool. Features that primarily enable commercial use, mass collection, redistribution of captured data, or commercial AI / advertising / lead-generation pipelines are out of scope and will be closed.

## Reporting bugs

Open a GitHub issue with:

- What you tried
- What you expected
- What actually happened
- Which Facebook surface was involved — feed, group feed, group permalink, page post, profile post, photo viewer, etc.
- Operating system + browser version
- Obsidian version

**Do not paste screenshots that contain other people's posts, comments, names, or profile pictures.** If you need to share Facebook content to demonstrate a bug, scrub identifying details first. The same applies to logs and `console.log` output.

## Proposing features

Open an issue first. Describe the use case (personal / hobby — see scope above). If the change is more than a small fix, please wait for a thumbs-up before writing the code so we can agree on the approach.

## Pull requests

Before opening a PR:

1. `npm install`
2. `npm run build` — confirm the extension builds without errors
3. Reload the unpacked extension in `chrome://extensions/`
4. Manually exercise the flow your change touches: scan a real Facebook tab, export to a real vault, check the resulting Markdown
5. If you touched the Obsidian plugin: `cd obsidian-plugin && npm install && npm run build`, then reload Obsidian and reproduce the flow

Keep PRs small. One feature or fix per PR.

## Style

- TypeScript strict mode. Avoid `any` outside test helpers and explicit casts at the `chrome.*` boundary.
- Named exports. Default exports only for React components.
- Prefer editing existing files over creating new ones.
- Default to no comments. Only add a comment when the *why* is non-obvious.

## Security

If you find a security issue — a way to make the extension read content from outside Facebook, a way to make the plugin write outside the vault, an unauthenticated network call, anything that could leak personal data — please open an issue with the label "security" rather than a public PR with the fix. We can co-ordinate the patch and the disclosure.
