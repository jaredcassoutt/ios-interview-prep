#!/bin/bash
# Double-click this file to serve the site at http://localhost:8777
cd "$(dirname "$0")" || exit 1
PORT=8777
echo "iOS Interview Prep -> http://localhost:$PORT"
echo "Press Control-C to stop."
( sleep 1; open "http://localhost:$PORT" ) &
python3 -m http.server "$PORT"
