# Venbot

Venbot is a Discord bot used on the [Vencord](https://vencord.dev) Discord server.

This bot is extremely specific and not configurable so there is really no reason for you to want to self host it

Nevertheless it is still available under a free software license so you can easily audit and modify it!

## Setup

Prequisites: git, nodejs, pnpm

1. Clone the repository
2. Copy `assets/examples/config.example.ts` to `config.ts` (in the root folder) and fill in all values

## Running

1. Run `pnpm install` to install dependencies
2. Run `pnpm start` to start the bot

## Running as a service

1. Copy `assets/examples/venbot.service` to your systemd service directory. You might have to tweak the `WorkingDirectory` value.
2. Enable & Start the `venbot` systemd service via `systemctl [--user] enable --now venbot`
