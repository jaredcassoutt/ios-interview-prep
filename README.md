# iOS Interview Prep

A local, offline study site for senior iOS engineering interviews. No build step, no
dependencies, no network. Progress is stored in the browser.

## Running it

Two options:

1. **Double-click `index.html`.** It works straight off the file system, which is why the
   content lives in `.js` files rather than JSON.
2. **Double-click `start.command`** to serve it at `http://localhost:8777` and open a browser.

## What's in it

| | |
|---|---|
| Topics | 30, across 6 domains |
| Flashcards | ~307, scheduled with SM-2 spaced repetition |
| Quiz questions | ~180 multiple choice, with explanations |
| Coding challenges | 25, with hints, reference solutions, and interviewer notes |
| Mock interview prompts | 18, with self-scoring rubrics and follow-ups |
| Badges | 39 |

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
