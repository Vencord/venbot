# Venbot

Venbot is a Discord bot used on the [Vencord](https://vencord.dev) Discord server.

This bot is very specialised for the Vencord server and its community, so it might not be very useful for other servers.

Nevertheless it is still available under a free software license so you can easily audit and modify it!

## Setup

Prequisites: git, nodejs, pnpm

1. Clone the repository
2. Copy `assets/examples/config.example.ts` to `src/config.ts` and fill in all values. Many modules can be disabled via their `enabled` config value.
    If you disable a module, you don't need to fill in any other config values for it.

## Running

1. Run `pnpm install` to install dependencies
2. Run `pnpm start` to start the bot

## Running as a service

1. Copy `assets/examples/venbot.service` to your systemd service directory. Tweak the `WorkingDirectory` value to wherever you cloned the repo.
2. Enable & Start the `venbot` systemd service via `systemctl [--user] enable --now venbot`

## HTTP Server

The bot includes a HTTP server that is used for some modules (namely GitHub linking and the Vencord reporter). If you want to enable it,
you also have to set up a reverse proxy to forward traffic to the bot.

I suggest [Caddy](https://caddyserver.com/). You can find an example Caddyfile in `assets/examples/Caddyfile`. The Caddyfile and `config.ts` file
should have matching domains and port.
