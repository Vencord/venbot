import { BaseIssue, BaseSchema, InferOutput, parse, ValiError } from "valibot";

export function mustParse<const TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>>(
    errorTitle: string,
    schema: TSchema,
    input: unknown
): InferOutput<TSchema> {
    try {
        return parse(schema, input);
    } catch (e) {
        if (!(e instanceof ValiError)) throw e;

        let message = `${errorTitle}:`;
        const issues = e.issues
            .map(({ path, expected, received }) => `\t${path[0].key}: expected ${expected}, got ${received}`)
            .join("\n");

        message += issues
            ? `\n${issues}`
            : e.message;

        console.error(message);
        process.exit(1);
    }
}
