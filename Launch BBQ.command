#!/bin/bash

cd /Users/andrew/bbq || exit 1
git pull origin main
npm install

port_pids="$(lsof -tiTCP:5173 -sTCP:LISTEN)"

for port_pid in $port_pids; do
  server_command="$(ps -p "$port_pid" -o command=)"
  server_cwd="$(lsof -a -p "$port_pid" -d cwd -Fn | sed -n 's/^n//p')"

  if [[ "$server_command" == *vite* && "$server_cwd" == "/Users/andrew/bbq"* ]]; then
    echo "Stopping the existing BBQ Display server on port 5173..."
    kill -TERM "$port_pid"

    for _ in {1..20}; do
      if ! kill -0 "$port_pid" 2>/dev/null; then
        break
      fi

      sleep 0.25
    done

    if kill -0 "$port_pid" 2>/dev/null; then
      echo "The existing BBQ Display server did not stop cleanly."
      exit 1
    fi
  else
    echo "Port 5173 is in use by a process that is not this BBQ Vite server:"
    echo "$server_command"
    exit 1
  fi
done

npm run display
