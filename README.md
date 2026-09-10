# iOS Interview Prep

A local, offline study site for senior iOS engineering interviews. No build step, no
dependencies, no network. Progress is stored in the browser.

## Running it

Two options:

1. **Double-click `index.html`.** It works straight off the file system, which is why the
   content lives in `.js` files rather than JSON.
2. **Double-click `start.command`** to serve it at `http://localhost:8777` and open a browser.
   It uses the bundled `serve.js` (Node). Avoid `python3 -m http.server` here: it drops
   parallel requests for this many files, and the page will report incomplete content.

## What's in it

| | |
|---|---|
| Topics | 38, across 7 domains |
| Flashcards | 392, scheduled with SM-2 spaced repetition |
| Quiz questions | 227 multiple choice, with explanations |
| Coding challenges | 30, with hints, reference solutions, and interviewer notes |
| Mock interview prompts | 21, with self-scoring rubrics and follow-ups |
| Badges | 41 |
| Diagrams | 23, inline SVG |

The UI half of the syllabus is split deliberately: 8 SwiftUI topics against 7 UIKit ones,
so SwiftUI is 53% of the UI content. UIKit stays because view controller lifecycle, the
layout pass and view hierarchy questions are still asked, but declarative UI carries the
larger share.

Everything is tagged `easy` / `medium` / `hard` and filterable.

## The five study modes

**Flashcards** are the core. Each answer is graded Again / Hard / Good / Easy, and an SM-2
scheduler decides when the card comes back. Cards you fail return later in the same session.
Keyboard: `Space` reveals, `1`–`4` grade.

**Quiz** is timed multiple choice. Questions you previously got wrong are weighted into
future rounds. Keyboard: `A`–`D` or `1`–`4` to answer, `Enter` to continue.

**Code challenges** give you a Swift editor with syntax highlighting, a timer, staged hints,
and a reference solution plus a note on what the interviewer is actually assessing. Your
work is saved per challenge as you type.

**Mock interview** gives you an open-ended design prompt and a talk timer. Answer out loud
first, then reveal the rubric and tick off what you actually covered.

**The Gauntlet** is the boss run: 25 rapid-fire questions spread across all six domains,
three lives, fifteen seconds each. Consecutive correct answers build a score multiplier up
to 4x, and one wrong answer or one timeout resets it and costs a life. Personal bests for
score and combo are tracked.

## Progress and XP

Studying earns XP, which moves you through twelve levels from Curious Beginner to Interview
Final Boss. Three daily quests rotate each day, with a bonus for clearing all three. Streaks
count consecutive days. Badges unlock for milestones, mastery, and a few odd habits.

Mastery per topic is derived from how far out its cards are scheduled, so it only climbs as
you keep getting things right over days, not by clicking through once.

## How progress is stored

This is a **fully static site**. There is no server, no database, no account, and no
analytics, so nothing you do here is sent anywhere. That also means progress cannot follow
you by IP address or server cookie, because there is no server to set one.

Progress is written to the browser's `localStorage`, keyed to the origin. In practice:

- It persists across tabs, reloads and restarts.
- It is **per browser and per device**. Chrome on your laptop and Safari on your phone keep
  separate progress.
- It is wiped if you clear site data, and private windows start empty.

Settings has **Download backup** and **Restore from file** for moving progress between
devices, plus a copy/paste text version for when a file is inconvenient.

## How questions are worded

Questions are phrased the way an interviewer actually asks them, not as textbook headings.
The reference points were published question banks and Google iOS interview write-ups,
where the two recurring shapes are the blunt one ("What is the difference between weak,
strong and unowned?") and the Google-style prompt ("Explain Grand Central Dispatch and when
you would use it in an iOS application").

52 questions were rewritten from heading-style to interview-style. Each keeps its original
wording in an `alias` field, and `js/core.js` derives the scheduling key from
`alias || q`, so rewording a question never resets its review history or detaches its
diagram.

```
alias: 'State the Hashable contract.',
q: 'What contract does Hashable require you to uphold?',
```

## How answers are written

Answers are built for **scanning**, not for reading top to bottom. Roughly nine in ten
carry a table, a pro/con list or a verdict line, and no answer contains a paragraph longer
than about forty words.

The renderer in `js/ui.js` supports a deliberately small, line-oriented markup:

```
First line        the lead sentence, styled as the gist
- item            a bullet
+ item            a point in favour, green
! item            a cost or caveat, red
| a | b |         a table row; a |---| line marks the header
> text            a quote block
=> text           the closing verdict
```

Inline, `**bold**` and `` `code` `` work anywhere. Comparisons get a table, trade-offs get
paired `+` and `!` lists, and most answers close with a `=>` line carrying the single thing
worth remembering.

Fenced code blocks take an optional label, so a rule can be shown rather than described:

````
```bad  a short caption saying what is wrong
```good  and what to do instead
```
````

40 cards carry a matched Avoid / Prefer pair, on the questions where seeing the wrong
version is what makes the right one stick.

## Diagrams

Twenty-three cards carry a diagram under the answer, concentrated on comparisons where a
picture does the work a paragraph struggles with: frame against bounds, serial against
concurrent queues, compositional against flow layout, `List` against `LazyVStack`,
`@Observable` against `ObservableObject`, cursor against offset pagination.

They are **inline SVG drawn by JavaScript**, not image files. That means:

- No binary assets, so the repository stays text. The whole system is about 30 KB of source.
- Every colour comes from the same CSS custom properties as the rest of the interface, so
  a diagram can never drift from the palette.
- Motion is CSS keyframes. Each figure is legible with animation switched off, and
  `prefers-reduced-motion` holds the resting state rather than flickering.

`js/figures.js` and `js/figures2.js` define them. `js/figure-map.js` attaches each one to a
card by matching question text, so the content files stay free of presentation concerns and
the whole mapping is readable in one place. It warns in the console if a mapping goes stale.

## Design

Neutral chassis, chromatic content. The greys are deliberately neutral so the six domain
hues carry the identity: blue, mint, amber, pink, red-orange, violet, cyan. Domain colour appears
structurally, as spines on rows and fills in the readiness chart, never as decoration.
Primary buttons are white, because a bright accent would compete with six domain colours.

The overview leads with a readiness chart rather than a completion ring: one column per
domain, height as mastery, so a glance tells you which domain will sink the interview.

Type is Space Grotesk for display and chrome, the system stack for long answer prose, and
JetBrains Mono for code. Fonts load from Google Fonts with a system fallback, so the page
still works offline, just in the fallback face.

## Deploying

The site is served from GitHub Pages off the `main` branch root. Every path is relative, so
pushing to `main` is the whole deploy. There is no build step.

## Layout

```
index.html          shell and script order
css/app.css         all styling
js/core.js          content registry
js/store.js         persistence, SM-2, XP, quests, badges
js/ui.js            helpers, Swift highlighter, confetti, toasts
js/*.js             one file per view
data/*.js           all content
start.command       local server
```

Adding a topic means adding one `IPREP.addTopic({...})` call in the relevant `data/` file.
Card identity is a hash of the question text, so reordering or editing other cards does not
reset your scheduling.
