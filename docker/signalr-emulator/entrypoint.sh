#!/bin/sh
set -e

# Start the emulator in background, capturing all output to a log file.
# We need to parse the connection string it prints on startup so that
# Azure Functions can use the emulator's actual access key.
asrs-emulator start --ip 0.0.0.0 --port 8888 > /tmp/emulator.log 2>&1 &
EMULATOR_PID=$!

# Wait for the connection string to appear in the log (up to 60 seconds).
echo "[entrypoint] Waiting for emulator to output connection string..."
for i in $(seq 1 60); do
  if grep -q "Endpoint=" /tmp/emulator.log 2>/dev/null; then
    break
  fi
  sleep 1
done

# Extract the connection string and write it to the shared volume.
# Replace 0.0.0.0 with the Docker Compose service name so other containers can reach us.
cs=$(grep -o 'Endpoint=[^ ]*' /tmp/emulator.log | head -1 | tr -d '[:space:]' | sed 's|0\.0\.0\.0|signalr-emulator|g')
if [ -n "$cs" ]; then
  mkdir -p /shared
  printf '%s' "$cs" > /shared/connection-string
  echo "[entrypoint] Connection string saved to /shared/connection-string"
  echo "[entrypoint] $cs"
else
  echo "[entrypoint] WARNING: Could not extract connection string from emulator output."
  echo "[entrypoint] Log contents:"
  cat /tmp/emulator.log
fi

# Stream the log to stdout so `docker logs` works.
tail -f /tmp/emulator.log &

# Wait for the emulator process (keeps container alive).
wait $EMULATOR_PID
