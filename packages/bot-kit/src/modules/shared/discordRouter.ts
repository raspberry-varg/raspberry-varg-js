import type { Client } from 'discord.js';

export interface DiscordRouter {
  listen(client: Client): void;
  off(client: Client): void;
}
