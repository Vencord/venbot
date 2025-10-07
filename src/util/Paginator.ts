import { ButtonStyles, ComponentTypes, CreateMessageOptions, EmbedOptions, GuildComponentSelectMenuInteraction, InteractionTypes, Message, MessageFlags, TextInputStyles } from "oceanic.js";

import { Emoji, Millis } from "~/constants";
import { handleInteraction } from "~/SlashCommands";
import { silently } from "~/util/functions";

import { randomUUID } from "crypto";
import { reply } from "./discord";
import { Promiseable } from "./types";

export interface BasePaginator {
    userId: string;
    totalPages: number;
    navigateTo(page: number): Promise<void>;
    firstPage(): Promise<void>;
    nextPage(): Promise<void>;
    previousPage(): Promise<void>;
    lastPage(): Promise<void>;
}

export const paginators = new Map<string, BasePaginator>();

export class Paginator<T> implements BasePaginator {
    private _timeout: NodeJS.Timeout | undefined = undefined;

    public readonly id = randomUUID();
    public readonly totalPages: number;

    public message: Message | null = null;
    public userId: string = "";
    public currentPage = 0;

    public getPageData: (page: number) => T[] = this._getPageData;
    public getTitle = (page: number) => this.title;

    constructor(
        readonly title: string,
        readonly data: T[],
        readonly pageSize: number,
        readonly renderPage: (data: T[], page: number) => Promiseable<string | Omit<EmbedOptions, "footer">>,
        readonly footerExtra?: string
    ) {
        if (!data.length)
            throw new Error("Paginator data cannot be empty.");

        this.totalPages = Math.ceil(data.length / pageSize);
    }

    get isFirstPage() {
        return this.currentPage === 0;
    }

    get isLastPage() {
        return this.currentPage === this.totalPages - 1;
    }

    async create(targetMessage: Message) {
        await this.destroy();

        this.message = await reply(targetMessage, await this.buildMessageData(0));

        this.userId = targetMessage.author.id;
        this.startTimeout();
        paginators.set(this.id, this);
    }

    async destroy() {
        if (this.message) {
            // might error if the message is deleted
            silently(this.message.edit({ components: [] }));
            this.message = null;
        }

        paginators.delete(this.id);
        clearTimeout(this._timeout);
    }

    async navigateTo(page: number) {
        await this.message!.edit(await this.buildMessageData(page));
        this.startTimeout();
        this.currentPage = page;
    }

    async nextPage() {
        if (!this.isLastPage) {
            await this.navigateTo(this.currentPage + 1);
        }
    }

    async previousPage() {
        if (!this.isFirstPage) {
            await this.navigateTo(this.currentPage - 1);
        }
    }

    async firstPage() {
        if (!this.isFirstPage) {
            await this.navigateTo(0);
        }
    }

    async lastPage() {
        if (!this.isLastPage) {
            await this.navigateTo(this.totalPages - 1);
        }
    }

    private async buildMessageData(page: number) {
        const { id, totalPages } = this;
        const isFirstPage = page === 0;
        const isLastPage = page === totalPages - 1;

        return {
            embeds: [await this.buildEmbed(page)],
            components: [{
                type: ComponentTypes.ACTION_ROW,
                components: [
                    {
                        type: ComponentTypes.BUTTON,
                        customID: `paginator:first:${id}`,
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: Emoji.DoubleLeft },
                        disabled: isFirstPage,
                    },
                    {
                        type: ComponentTypes.BUTTON,
                        customID: `paginator:prev:${id}`,
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: Emoji.Left },
                        disabled: isFirstPage,
                    },
                    {
                        type: ComponentTypes.BUTTON,
                        customID: `paginator:go-to-modal:${id}`,
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: Emoji.InputNumbers },
                        disabled: totalPages === 1,
                    },
                    {
                        type: ComponentTypes.BUTTON,
                        customID: `paginator:next:${id}`,
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: Emoji.Right },
                        disabled: isLastPage,
                    },
                    {
                        type: ComponentTypes.BUTTON,
                        customID: `paginator:last:${id}`,
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: Emoji.DoubleRight },
                        disabled: isLastPage,
                    }
                ]
            }]
        } satisfies CreateMessageOptions;
    }

    private _getPageData(page: number) {
        const start = page * this.pageSize;
        const end = start + this.pageSize;
        return this.data.slice(start, end);
    }

    private async buildEmbed(page: number) {
        const data = await this.renderPage(this.getPageData(page), page);

        let footerText = `Page ${page + 1}/${this.totalPages}`;
        if (this.footerExtra) {
            footerText += `  •  ${this.footerExtra}`;
        }

        const baseEmbed: EmbedOptions = {
            title: this.getTitle(page),
            footer: {
                text: footerText,
            }
        };

        return typeof data === "string"
            ? { ...baseEmbed, description: data }
            : { ...baseEmbed, ...data };
    }

    private startTimeout() {
        clearTimeout(this._timeout);
        this._timeout = setTimeout(
            () => this.destroy(),
            5 * Millis.MINUTE
        );
    }
}

handleInteraction({
    type: InteractionTypes.MESSAGE_COMPONENT,
    isMatch: i => i.data.customID.startsWith("paginator:"),
    async handle(interaction) {
        const [, action, id] = interaction.data.customID.split(":");
        const paginator = paginators.get(id);

        if (!paginator) return;

        if (interaction.user.id !== paginator.userId)
            return interaction.reply({
                content: `This button is not for you! ${Emoji.Anger}`,
                flags: MessageFlags.EPHEMERAL
            });

        if (action !== "go-to-modal")
            await interaction.deferUpdate();

        switch (action) {
            case "first":
                await paginator.firstPage();
                break;
            case "prev":
                await paginator.previousPage();
                break;
            case "next":
                await paginator.nextPage();
                break;
            case "last":
                await paginator.lastPage();
                break;
            case "go-to":
                if (!interaction.isSelectMenuComponentInteraction()) return;

                const page = Number((interaction as GuildComponentSelectMenuInteraction).data.values.getStrings()[0]);
                await paginator.navigateTo(page);
                break;
            case "go-to-modal":
                await interaction.createModal({
                    title: "Go To Page",
                    customID: `paginator:go-to-modal-submit:${id}`,
                    components: [{
                        type: ComponentTypes.ACTION_ROW,
                        components: [{
                            type: ComponentTypes.TEXT_INPUT,
                            label: "Page Number",
                            customID: "page",
                            placeholder: "1",
                            style: TextInputStyles.SHORT,
                            required: true,
                            maxLength: 4
                        }]
                    }]
                });
                break;
        }
    }
});

handleInteraction({
    type: InteractionTypes.MODAL_SUBMIT,
    isMatch: i => i.data.customID.startsWith("paginator:go-to-modal-submit:"),
    async handle(interaction) {
        const [, , id] = interaction.data.customID.split(":");
        const paginator = paginators.get(id);

        if (!paginator) return;

        const page = Number(interaction.data.components.getTextInput("page"));
        if (isNaN(page) || page < 1 || page > paginator.totalPages) {
            return interaction.reply({
                content: `Invalid page number. Must be a valid number and between 1 and ${paginator.totalPages}`,
                flags: MessageFlags.EPHEMERAL
            });
        }

        await interaction.deferUpdate();
        await paginator.navigateTo(page - 1);
    }
});
