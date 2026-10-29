#!/bin/sh
set -eu

cd "${HOME}/venbot"

before=$(git rev-parse HEAD)

if git pull --ff-only; then
    after=$(git rev-parse HEAD)
else
    echo "git pull failed, using current checkout" >&2
    after=$before
fi

if [ "$before" != "$after" ] || ! podman image exists localhost/venbot:latest; then
    podman build -t localhost/venbot:latest .
fi
