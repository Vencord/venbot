# Annoying Domains

The files in this directory contain several lists of image host domains to be consumed by Vaius's automod module.

They are autodeleted because they fall under any of the following criteria:
- Offensive / explicit domain names
- Suspicious host
- Annoying embeds

Adding new lists is as simple as creating a new file.

### sxcu

Go to <https://sxcu.net/domains.php?ipp=200>

For each page, run

```js
copy(
  [...document.querySelectorAll("td:has(.badge)")]
    .map((e) => e.innerText.split(" ")[1])
    .join("\n")
);
```

### encrypting.host

```js
copy(
  $$("div:has([name='domains']) li")
    .map(l => l.textContent.split(" ").shift().replace("*.", ""))
    .filter(d => d.includes("."))
    .join("\n")
)
```
