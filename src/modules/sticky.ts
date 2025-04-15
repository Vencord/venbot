
import { Vaius } from "~/Client";
import { BotState } from "~/db/botState";
import { debounce, silently } from "~/util/functions";

const StickyStates = new Map<string, StickyState>();

export class StickyState {
    private lastMessageId: string | null = null;
    private isDestroyed = false;

    constructor(public channelId: string) {
        if (BotState.stickies[channelId]?.enabled)
            this.createDebouncer();
    }

    static getOrCreate(channelId: string) {
        let sticky = StickyStates.get(channelId);
        if (!sticky) {
            if (!BotState.stickies[channelId]) return null;

            sticky = new StickyState(channelId);
            StickyStates.set(channelId, sticky);
        }
        return sticky;
    }

    public repostMessage() { }

    public async createDebouncer() {
        const delayMs = BotState.stickies[this.channelId]?.delayMs;
        if (!delayMs) return this.destroy();

        this.repostMessage = debounce(this.createMessage.bind(this), delayMs);
    }

    async createMessage() {
        if (this.isDestroyed) return;

        const content = BotState.stickies[this.channelId]?.message;
        if (!content) return this.destroy();

        await this.deleteMessage();

        const message = await Vaius.rest.channels.createMessage(this.channelId, {
            content: `${content}\n-# This is an automated sticky message.`,
            allowedMentions: {
                everyone: false,
                roles: [],
            }
        });

        this.lastMessageId = message.id;
    }

    async deleteMessage() {
        if (this.lastMessageId) {
            await silently(Vaius.rest.channels.deleteMessage(this.channelId, this.lastMessageId));
            this.lastMessageId = null;
        }
    }

    async destroy() {
        this.isDestroyed = true;

        await this.deleteMessage();
        StickyStates.delete(this.channelId);
    }
}

Vaius.on("messageCreate", async msg => {
    if (msg.author.bot) return;

    const sticky = StickyState.getOrCreate(msg.channelID);
    if (!sticky) return;

    sticky.repostMessage();
});
