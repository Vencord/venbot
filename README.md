# Venbot

Venbot is a Discord bot used on the [Vencord](https://vencord.dev) Discord server.

This bot is extremely specific and not configurable so there is really no reason for you to want to self host it

Nevertheless it is still available under a free software license so you can easily audit and modify it!

## Setup

Prequisites: git, nodejs, pnpm

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in all values
3. Copy `venbot.service` to your systemd service directory. You might have to tweak the `WorkingDirectory` value.
4. Enable & Start the `venbot` systemd service via `systemctl [--user] enable --now venbot`
