import { ButtonStyles, CreateMessageOptions, Message, MessageComponent, MessageFlags } from "oceanic.js";

import { Emoji, Millis } from "~/constants";
import { silently } from "~/util/functions";

import { randomUUID } from "crypto";
import { ActionRow, Button, Container, TextDisplay } from "~components";
import { reply } from "./discord";
import { BasePaginator, paginators } from "./Paginator";
import { Promiseable } from "./types";

export class PaginatorCv2<T> implements BasePaginator {
    private _timeout: NodeJS.Timeout | undefined = undefined;

    public readonly id = randomUUID();
    public readonly totalPages: number;

    public message: Message | null = null;
    public userId: string = "";
    public currentPage = 0;

    public getPageData: (page: number) => T[] = this._getPageData;
    public getTitle = (page: number) => this.title;
    public renderTableOfContents?: (pageCount: number) => Promiseable<string | MessageComponent[]>;

    constructor(
        readonly title: string,
        readonly data: T[],
        readonly pageSize: number,
        readonly renderPage: (data: T[], page: number) => Promiseable<string | MessageComponent[]>,
        readonly footerExtra?: string
    ) {
        if (!data.length)
            throw new Error("Paginator data cannot be empty.");

        this.totalPages = Math.ceil(data.length / pageSize);
    }

    get totalPagesWithTableOfContents() {
        return this.renderTableOfContents ? this.totalPages + 1 : this.totalPages;
    }

    get isFirstPage() {
        return this.currentPage === 0;
    }

    get isLastPage() {
        return this.currentPage === this.totalPagesWithTableOfContents - 1;
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

    async _navigateTo(page: number) {
        await this.message!.edit(await this.buildMessageData(page));
        this.startTimeout();
        this.currentPage = page;
    }

    async navigateTo(page: number) {
        if (this.renderTableOfContents)
            page++;

        return this._navigateTo(page);
    }

    async nextPage() {
        if (!this.isLastPage) {
            await this._navigateTo(this.currentPage + 1);
        }
    }

    async previousPage() {
        if (!this.isFirstPage) {
            await this._navigateTo(this.currentPage - 1);
        }
    }

    async firstPage() {
        if (!this.isFirstPage) {
            await this._navigateTo(0);
        }
    }

    async lastPage() {
        if (!this.isLastPage) {
            await this._navigateTo(this.totalPagesWithTableOfContents - 1);
        }
    }

    private async buildMessageData(page: number) {
        const { id, totalPages, totalPagesWithTableOfContents } = this;
        const isFirstPage = page === 0;
        const isLastPage = page === totalPagesWithTableOfContents - 1;

        return {
            flags: MessageFlags.IS_COMPONENTS_V2,
            components: <>
                <Container>
                    {await this.buildComponents(page)}
                </Container>
                <ActionRow>
                    <Button
                        customID={`paginator:first:${id}`}
                        style={ButtonStyles.PRIMARY}
                        emoji={{ name: Emoji.DoubleLeft }}
                        disabled={isFirstPage}
                    />
                    <Button
                        customID={`paginator:prev:${id}`}
                        style={ButtonStyles.PRIMARY}
                        emoji={{ name: Emoji.Left }}
                        disabled={isFirstPage}
                    />
                    <Button
                        customID={`paginator:go-to-modal:${id}`}
                        style={ButtonStyles.PRIMARY}
                        emoji={{ name: Emoji.InputNumbers }}
                        disabled={totalPages === 1}
                    />
                    <Button
                        customID={`paginator:next:${id}`}
                        style={ButtonStyles.PRIMARY}
                        emoji={{ name: Emoji.Right }}
                        disabled={isLastPage}
                    />
                    <Button
                        customID={`paginator:last:${id}`}
                        style={ButtonStyles.PRIMARY}
                        emoji={{ name: Emoji.DoubleRight }}
                        disabled={isLastPage}
                    />
                </ActionRow>
            </>
        } satisfies CreateMessageOptions;
    }

    public _getPageData(page: number) {
        const start = page * this.pageSize;
        const end = start + this.pageSize;
        return this.data.slice(start, end);
    }

    private async buildComponents(page: number) {
        const isTableOfContents = !!this.renderTableOfContents && page === 0;

        const actualPage = this.renderTableOfContents
            ? page - 1
            : page;

        let footerText = isTableOfContents
            ? null
            : `Page ${actualPage + 1}/${this.totalPages}`;

        if (this.footerExtra) {
            if (footerText)
                footerText += `  •  ${this.footerExtra}`;
            else
                footerText = this.footerExtra;
        }

        const data = isTableOfContents
            ? await this.renderTableOfContents!(this.totalPages)
            : await this.renderPage(this.getPageData(actualPage), actualPage);

        const title = isTableOfContents
            ? this.title
            : this.getTitle(actualPage);

        return (
            <>
                <TextDisplay># {title}</TextDisplay>
                {typeof data === "string" ? <TextDisplay>{data}</TextDisplay> : data}
                {!!footerText && <TextDisplay>-# {footerText}</TextDisplay>}
            </>
        );
    }

    private startTimeout() {
        clearTimeout(this._timeout);
        this._timeout = setTimeout(
            () => this.destroy(),
            5 * Millis.MINUTE
        );
    }
}
