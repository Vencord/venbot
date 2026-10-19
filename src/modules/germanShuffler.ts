import { GuildChannel } from "oceanic.js";

import { hourly } from "~/util/hourly";
import { Vaius } from "~/Vaius";

const GermanChannelId = "1121201005456011366";

let currentIndex = 0;
const GermanSpeakingCountryFlags = [
    "🇩🇪",
    "🇦🇹",
    "🇨🇭",
    "🇱🇮",
    "🇱🇺",
    "🇧🇪",
    "🇳🇦"
];

hourly(() => {
    const chan = Vaius.getChannel(GermanChannelId) as GuildChannel;
    if (!chan) return;

    const flag = GermanSpeakingCountryFlags[currentIndex];
    currentIndex = (currentIndex + 1) % GermanSpeakingCountryFlags.length;

    chan.edit({ name: `${flag}-deutsch-german` });
});
