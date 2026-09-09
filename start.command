#!/bin/bash
# Double-click to serve the site at http://localhost:8777
cd "$(dirname "$0")" || exit 1
PORT=8777
echo "iOS Interview Prep -> http://localhost:$PORT"
echo "Press Control-C to stop."
( sleep 1; open "http://localhost:$PORT" ) &
if command -v node >/dev/null 2>&1; then
  node serve.js "$PORT"
else
  # Fallback. Python's http.server can drop parallel requests for this many
  # files; if content looks incomplete, reload.
  python3 -m http.server "$PORT"
fi
