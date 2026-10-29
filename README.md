# Venbot

Venbot is a Discord bot used on the [Vencord](https://vencord.dev) Discord server.

This bot is very specialised for the Vencord server and its community, so it might not be very useful for other servers.

Nevertheless it is still available under a free software license so you can easily audit and modify it!

## Setup

Prequisites: git, nodejs, pnpm

1. Clone the repository
2. Copy `assets/examples/config.example.toml` to `config.toml` and fill in all values. Many modules can be disabled via their `enabled` config value.
    If you disable a module, you don't need to fill in any other config values for it.

## Running

1. Run `pnpm install` to install dependencies
2. Run `pnpm start` to start the bot

## Running as a service

1. Copy `assets/examples/venbot.service` to your systemd service directory. Tweak the `WorkingDirectory` value to wherever you cloned the repo.
2. Enable & Start the `venbot` systemd service via `systemctl [--user] enable --now venbot`

## Running in a container

1. Build the image:
    ```sh
    podman build -t localhost/venbot .
    ```
2. Copy `assets/examples/venbot.container` to `~/.config/containers/systemd/venbot.container`. Tweak the volume paths if your checkout or badge directory are elsewhere.
3. Make sure `data/`, `config.toml` and the badge directory exist on the host.
4. Enable & Start the quadlet via `systemctl --user daemon-reload && systemctl --user enable --now venbot`

The image contains the bot and its assets. `data/` and `config.toml` are mounted from the host, as is `/var/www/badges.vencord.dev`
(used by the badge command). The HTTP server port is published according to `httpServer.port` in `config.toml` (8152 by default).

### Updating

The quadlet runs `scripts/container-update.sh` before every start. It pulls the latest commit and rebuilds the image when
the checkout changed (or when the image does not exist yet). This means the existing `v.update` flow keeps working: the bot
exits, systemd restarts it, the image is rebuilt, and the new container starts. `v.restart` also picks up any pushed changes.
If the pull fails (for example due to a network issue), the current checkout and image are used instead. If there are no new
commits, the bot still restarts but the image is not rebuilt.

The script assumes the repository is at `~/venbot`; adjust it if your checkout lives elsewhere.

## HTTP Server

The bot includes a HTTP server that is used for some modules (namely GitHub linking and the Vencord reporter). If you want to enable it,
you also have to set up a reverse proxy to forward traffic to the bot.

I suggest [Caddy](https://caddyserver.com/). You can find an example Caddyfile in `assets/examples/Caddyfile`. The Caddyfile and `config.toml` file
should have matching domains and port.
