import { AnyTextableGuildChannel, Message } from "oceanic.js";
import Config from "~/config";
import { Millis } from "~/constants";
import { silently } from "~/util/functions";
import { logAutoModAction } from "~/util/logAction";
import { until } from "~/util/time";

// Vencord.Webpack.find(m => Array.isArray(m) && m.includes("exe"))
const suspiciousFileExtensions = new Set<string>(JSON.parse('["7z","ade","adp","arj","apk","application","appx","appxbundle","asx","bas","bat","cab","cer","chm","cmd","cnt","cpl","crt","csh","deb","der","diagcab","dll","dmg","docm","dotm","ex","ex_","exe","fxp","gadget","grp","gz","hlp","hpj","hta","htc","inf","ins","ipa","iso","isp","its","jar","jnlp","jse","ksh","lib","lnk","mad","maf","mag","mam","maq","mar","mas","mat","mau","mav","maw","mcf","mda","mdb","mde","mdt","mdw","mdz","msc","msh","msh1","msh1xml","msh2","msh2xml","mshxml","msi","msix","msixbundle","msp","mst","msu","nsh","ops","osd","pcd","pif","pkg","pl","plg","potm","ppam","ppsm","pptm","prf","prg","printerexport","ps1","ps1xml","ps2","ps2xml","psc1","psc2","psd1","psdm1","pst","py","pyc","pyo","pyw","pyz","pyzw","rar","reg","rpm","scf","scr","sct","shb","shs","sldm","sys","theme","tmp","url","vb","vbe","vbp","vbs","vhd","vhdx","vsmacros","vsw","vxd","webpnp","ws","wsc","wsf","wsh","xbap","xlam","xll","xlsm","xltm","xnk","z","zip"]'));

export async function moderateSuspiciousFiles(msg: Message<AnyTextableGuildChannel>) {
    if (msg.member.roles.includes(Config.roles.regular)) return false;

    for (const attachment of msg.attachments.values()) {
        const ext = attachment.filename?.split(".").pop()?.toLowerCase();
        if (!ext || !suspiciousFileExtensions.has(ext)) continue;

        silently(msg.delete());
        silently(msg.member!.edit({ communicationDisabledUntil: until(10 * Millis.MINUTE), reason: "suspicious file attachment" }));
        logAutoModAction(`${msg.author.mention} posted a suspicious file (${attachment.filename}) in ${msg.channel!.mention}`);

        return true;
    }

    return false;
}
