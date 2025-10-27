const Config = {
    "token": "",
    "prefixes": ["v!", "v?", "v.", "v"],
    // id of the home guild of the bot. used for registering commands, etc
    "homeGuildId": "1015060230222131221",
    // "development" | "production"
    "mode": "development",

    "channels": {
        // channel where venbot will post automatic moderation logs, leave empty to disable
        "autoModLog": "1156349646965325824",

        // channel where venbot will post moderation logs (like ban, mute, etc), leave empty to disable
        "modLog": "1156349646965325824",

        // channel where venbot will send information like errors
        "dev": "1033680203433660458",
        // used as default for the not-support command and some other features
        "support": "1026515880080842772",

        // channels where support commands are allowed.
        // always includes channels.dev and channels.support
        "supportAllowedChannels": [
            "1345457031426871417", // vesktop support
            "1024286218801926184", // bot spam
        ],
    },

    "roles": {
        // anyone with this role can execute moderation commands
        "mod": "1026509424686284924",

        // used for github linking and some other things
        "donor": "1042507929485586532",
        // used for github linking and some other things
        "contributor": "1026534353167208489",
        // used for regular cotd
        "regular": "1026504932959977532",

        // roles that can be added or removed using the role management commands.
        // always includes roles.donor, roles.regular, and roles.contributor
        "manageableRoles": [
            "1191202487978438656", // programming
            "1136687385434918992", // image sender
            "1018310742874791977", // brain rot
            "1118620309382254654", // can't talk
            "1173623814211506207", // can't vc
            "1161815552919076867", // no modmail
            "1088566810976194693", // needy
            "1061276426478813245", // no support
            "1205614728148422716", // no programming
            "1427368278866792669", // no ai
            "1241355250129178775", // angelsachse (no german)
            "1136184488498561035", // snippet dev
        ]
    },

    "moderation": {
        // guilds members may share invites to. always includes homeGuildId
        "inviteAllowedGuilds": [
            "1015060230222131221", // vencord
            "811255666990907402", // aliucord
            "1015931589865246730", // vendetta
            "86004744966914048", // betterdiscord
            "538759280057122817", // powercord
            "950850315601711176", // enmity
            "920674107111137340", // stupidity archive
            "820732039253852171", // armcord
            "458997239738793984", // strencher
            "917308687423533086", // manti (reviewdb)
            "613425648685547541", // ddevs
            "891039687785996328", // kernel
            "244230771232079873", // progamers hangout
            "1096357702931841148", // decor
            "449175561529589761", // blackbox (userbg)
            "1196075698301968455", // pyoncord
            "1154257010532032512", // moonlight
            "961691461554950145", // hyprland
            "1097993424931672216", // aero
            "1116074561734197270", // dziurwa insane
            "820745488231301210", // ntts
            "603970300668805120", // discord previews
        ]
    },

    // rule command
    "rules": {
        "enabled": true,
        "rulesChannelId": "1015074670963335219"
    },

    // known issue command
    "knownIssues": {
        "enabled": true,
        "knownIssuesForumId": "1257025907625951423"
    },

    // submission pass command
    "submissionPass": {
        "enabled": true,
        "categoryId": "1256395889354997771",
        "passRoleId": "1257065526019231945"
    },

    // gemini ai command
    "gemini": {
        "enabled": false,
        "apiKey": "",
        "allowedRoles": [
            "1026509424686284924", // mod
            "1042507929485586532", // donor
            "1026534353167208489", // contributor
            "1026504932959977532", // regular
        ],
        "bannedRoles": [
            "1427368278866792669", // no ai
            "1018310742874791977"  // brain rot
        ],
    },

    "modmail": {
        "enabled": true,
        "channelId": "1161412933050437682",
        "logChannelId": "1161449871182659655",
        // role that will be mentioned (without ping) in new tickets to pull everyone into the thread
        "modRoleId": "1273266391449079858",
        // role that will be given to ban users from opening tickets
        "banRoleId": "1161815552919076867"
    },

    // http server used for some features.
    // github linking and reporter both depend on this server
    "httpServer": {
        "enabled": true,
        "port": 8152,
        "domain": "http://localhost:8152"
    },

    // link-github command which gives out contributor & donor roles
    "githubLinking": {
        "enabled": false,
        "clientId": "",
        "clientSecret": "",
        // Github Personal Access Token. Used to check if user is sponsoring you https://github.com/settings/tokens/new
        "pat": ""
    },

    // Advent of Code private leaderboard tracker
    "adventOfCode": {
        "enabled": false,
        // logged in browser cookie
        "cookie": "",
        // channel to post the leaderboard in
        "channelId": "1312179898550456350",
        // link to the leaderboard to use
        "leaderboardUrl": "https://adventofcode.com/2024/leaderboard/private/view/1776680",
    },

    "reporter": {
        "enabled": false,
        // Github PAT with workflow dispatch scope. Used to trigger reporter workflow
        "pat": "",
        // generate with `openssl rand -hex 128`
        "webhookSecret": "",
        // channel where each individual report will be posted
        "logChannelId": "1337479880849362994",
        // channel where the bot will post the latest status of stable and canary
        "statusChannelId": "1337479816240431115",
        // message id of the stable status message (must be in statusChannelId)
        "stableMessageId": "1337500395311992954",
        // message id of the canary status message (must be in statusChannelId)
        "canaryMessageId": "1337500381923774544",
    }
};

export default Config;
