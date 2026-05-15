# Jaspidian — Disclaimer

Read this before installing or using Jaspidian.

---

## Personal use only

Jaspidian is released under the **PolyForm Noncommercial 1.0.0** license. See [LICENSE](LICENSE).

You are permitted to use, modify, and redistribute Jaspidian for:

- Personal use (private archival, hobby projects, study, research)
- Use inside non-profit organisations, charities, schools, universities, public-health bodies, and government institutions

You are **not** permitted to:

- Use Jaspidian in or for any commercial product, service, or business activity
- Resell Jaspidian or any modified version of it
- Build a paid service on top of Jaspidian (e.g. a hosted "Facebook → vault" service)
- Use Jaspidian to gather data for commercial market research, lead generation, advertising, or analytics

If you want to use Jaspidian commercially, contact the maintainer to discuss a separate licence. Otherwise, please find a different tool.

## No affiliation with Meta, Facebook, or Obsidian

Jaspidian is an independent personal project. It is **not** affiliated with, endorsed by, or sponsored by Meta Platforms, Inc., Facebook, Obsidian.md, or any of their subsidiaries.

The names "Facebook" and "Obsidian" are used here only to describe the platforms Jaspidian interoperates with, in the same way that any clipping tool would describe the websites it works with.

## You are responsible for complying with Facebook's terms

Facebook's [Terms of Service](https://www.facebook.com/terms.php) restrict automated data collection. Although Jaspidian only captures content that is **already rendered in your own logged-in browser session** — and does no login automation, no API access, and no access-control bypass — operating any extension that systematically extracts Facebook content may still breach Meta's terms in your jurisdiction.

**You alone are responsible** for deciding whether using Jaspidian is appropriate given:

- Facebook's current Terms of Service
- The laws of your country
- The privacy expectations of people whose posts and comments you capture

The author of Jaspidian takes no responsibility for any Facebook-account action, legal action, or other consequence resulting from your use of the tool.

## You are responsible for what you do with the optional AI feature

The Obsidian plugin includes an opt-in "prettify with AI" feature. It is **off by default**. If you enable it and supply an OpenRouter API key (cloud service) or an Ollama URL (typically local), the plugin will send your captured note content to that provider whenever you save a note. By using this feature, you accept the provider's terms and privacy policy, and you accept responsibility for any third-party costs (e.g. OpenRouter API charges) that result. The Jaspidian authors are not responsible for actions, costs, or data handling by third-party AI providers.

## You are responsible for the data you capture

When you scan a Facebook post, Jaspidian captures the post body, comments, commenter names, and image links — all data about real people. Even though everything stays on your computer, you become responsible for that data.

Use common sense:

- Don't share captured notes that contain other people's content without their permission
- Don't aggregate or republish captured comments
- If you no longer need a capture, delete it
- Treat captured material the way you would treat a screenshot you took yourself

In the EU, UK, and similar jurisdictions, captured data is "personal data" subject to data-protection law. The "household exception" generally covers private, personal use; anything broader needs separate justification.

## No warranty

Jaspidian is provided **"as is"**, without warranty of any kind, express or implied.

- Facebook changes its DOM frequently. Captures may break or extract the wrong fields without notice.
- The Obsidian plugin writes files into your Obsidian vault. Although the writer validates paths to keep writes inside your vault root, **back up your vault** before first use and after major updates.
- The author makes no guarantee that Jaspidian will run, will continue to run, or will be updated when Facebook's site changes.

## No support guarantee

Jaspidian is a side project. Issues and pull requests on GitHub are welcome, but no response time is promised. There is no commercial support contract.

## If you don't agree

If you don't accept any of the above, do not install or use Jaspidian.

By installing Jaspidian you confirm you have read and accepted this disclaimer.
