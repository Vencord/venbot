// Deploy this worker to a Cloudflare Worker to use as a proxy for Google requests
// Generate a random secret for the SECRET environment variable:
// openssl rand -hex 32

function fail(status) {
    return new Response(null, { status });
}

export default {
    async fetch(request, env) {
        const secret = request.headers.get("secret");
        if (secret !== env.SECRET)
            return fail(401);

        const url = new URL(request.url).searchParams.get("url");
        if (!url)
            return fail(404);

        return fetch(url);
    }
};
