# Budgeting-in-out

A simple calendar for money coming in and going out. Open it, tap a day, add what
you earned or spent. It shows you what each week, month and year adds up to.

**Use it here:** https://addysha.github.io/Budgeting-in-out/

## Getting started

1. Open the link. Tap any day on the calendar to add something.
2. Click **⚙︎ Ins & Outs** to set up the things that happen every time — your pay,
   rent, subscriptions — so they fill themselves in.
3. Set your **starting balance** so the running totals mean something.

## Your numbers stay on your device

Nothing is sent anywhere. Everything is stored in your own browser, which means
only you can see it — and also that clearing your browsing data would erase it.

In Chrome or Edge, go to **⚙︎ Ins & Outs → Automatic backup** and choose a file
(somewhere that syncs, like OneDrive). Every change is then written to that file
straight away. **Restore backup** brings it all back on a new computer.

On other browsers use **Backup (JSON)** now and then instead.

## Running it from your own computer

Download the folder and open `index.html`. Keep the `css` and `js` folders
alongside it — the app needs all three.

## How it's put together

Plain HTML, CSS and JavaScript. No build step, no dependencies.

| Path | What's in it |
| --- | --- |
| `index.html` | The page structure |
| `css/styles.css` | All styling |
| `js/config.js` | Constants and the starting setup for a new user |
| `js/store.js` | Loading and saving to the browser |
| `js/dates.js` | Date and money helpers |
| `js/calc.js` | Repeating items, totals, balances |
| `js/render.js` | The day, week, month and year views |
| `js/day-modal.js` | The single-day sheet, and adding/editing entries |
| `js/settings.js` | The ins & outs sheet |
| `js/export.js` | CSV export and JSON backup |
| `js/backup.js` | Automatic backup to a file |
| `js/main.js` | Wires the buttons up and starts the app |
