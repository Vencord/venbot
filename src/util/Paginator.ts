import { ButtonStyles, ComponentTypes, CreateMessageOptions, EmbedOptions, InteractionTypes, Message, MessageFlags, TextInputStyles } from "oceanic.js";

import { Emoji, Millis } from "~/constants";
import { handleInteraction } from "~/SlashCommands";
import { reply } from "~/util";

let id = 0;

const paginators = new Map<number, Paginator<any>>();

export class Paginator<T> {
    private readonly id = id++;
    private timeout: NodeJS.Timeout | undefined = undefined;
    public message: Message | null = null;
    public userId: string = "";

    readonly totalPages: number;
    public currentPage = 0;

    constructor(
        readonly title: string,
        readonly data: T[],
        readonly pageSize: number,
        readonly renderPage: (data: T[], page: number) => string | Omit<EmbedOptions, "footer">,
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

        this.message = await reply(targetMessage, this.buildMessageData(0));

        this.userId = targetMessage.author.id;
        this.startTimeout();
        paginators.set(this.id, this);
    }

    async navigateTo(page: number) {
        await this.message!.edit(this.buildMessageData(page));
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

    private buildMessageData(page: number) {
        const isFirstPage = page === 0;
        const isLastPage = page === this.totalPages - 1;

        return {
            embeds: [this.buildEmbed(page)],
            components: [{
                type: ComponentTypes.ACTION_ROW,
                components: [
                    {
                        type: ComponentTypes.BUTTON,
                        customID: `paginator:first:${this.id}`,
                        style: ButtonStyles.PRIMARY,
                        emoji: { name: Emoji.DoubleLeft },
                        disabled: isFirstPage,
                    },
                    {
                        type: ComponentTypes.BUTTON,
                        customID: `paginator:prev:${this.id}`,
                        style: ButtonStyles.PRIMARY,
                        emoji: { name: Emoji.Left },
                        disabled: isFirstPage,
                    },
                    {
                        type: ComponentTypes.BUTTON,
                        customID: `paginator:go-to:${this.id}`,
                        style: ButtonStyles.PRIMARY,
                        emoji: { name: Emoji.InputNumbers },
                        disabled: this.totalPages === 1,
                    },
                    {
                        type: ComponentTypes.BUTTON,
                        customID: `paginator:next:${this.id}`,
                        style: ButtonStyles.PRIMARY,
                        emoji: { name: Emoji.Right },
                        disabled: isLastPage,
                    },
                    {
                        type: ComponentTypes.BUTTON,
                        customID: `paginator:last:${this.id}`,
                        style: ButtonStyles.PRIMARY,
                        emoji: { name: Emoji.DoubleRight },
                        disabled: isLastPage,
                    }
                ]
            }]
        } satisfies CreateMessageOptions;
    }

    private buildEmbed(page: number) {
        const start = page * this.pageSize;
        const end = start + this.pageSize;
        const pageData = this.data.slice(start, end);

        const data = this.renderPage(pageData, page);

        let footerText = `Page ${page + 1}/${this.totalPages}`;
        if (this.footerExtra) {
            footerText += `  •  ${this.footerExtra}`;
        }

        const baseEmbed: EmbedOptions = {
            title: this.title,
            footer: {
                text: footerText,
            }
        };

        return typeof data === "string"
            ? { ...baseEmbed, description: data }
            : { ...baseEmbed, ...data };
    }

    private startTimeout() {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(
            () => this.destroy(),
            5 * Millis.MINUTE
        );
    }

    private async destroy() {
        if (this.message) {
            await this.message.edit({ components: [] });
            this.message = null;
        }

        paginators.delete(this.id);
        clearTimeout(this.timeout);
    }
}

handleInteraction(InteractionTypes.MESSAGE_COMPONENT, {
    isMatch: i => i.data.customID.startsWith("paginator:"),
    async handle(interaction) {
        const [, action, id] = interaction.data.customID.split(":");
        const paginator = paginators.get(Number(id));

        if (!paginator) return;

        if (interaction.user.id !== paginator.userId)
            return interaction.reply({
                content: `This button is not for you! ${Emoji.Anger}`,
                flags: MessageFlags.EPHEMERAL
            });

        if (action !== "go-to")
            await interaction.deferUpdate();

        switch (action) {
            case "first":
                await paginator.navigateTo(0);
                break;
            case "prev":
                await paginator.previousPage();
                break;
            case "next":
                await paginator.nextPage();
                break;
            case "last":
                await paginator.navigateTo(paginator.totalPages - 1);
                break;
            case "go-to":
                await interaction.createModal({
                    title: "Go To Page",
                    customID: `paginator:go-to-submit:${id}`,
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

handleInteraction(InteractionTypes.MODAL_SUBMIT, {
    isMatch: i => i.data.customID.startsWith("paginator:go-to-submit:"),
    async handle(interaction) {
        const [, _action, id] = interaction.data.customID.split(":");
        const paginator = paginators.get(Number(id));

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
