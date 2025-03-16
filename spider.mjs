import * as fs from "node:fs";
import * as http from "node:http";
import * as https from "node:https";

let data = {
  crawled: [],
  crawledData: [],
  crawling: []
}

if (fs.existsSync("crawldata/data")) {
  data = JSON.parse(fs.readFileSync("crawldata/data", { encoding: "utf8", flag: "r" }));
}

function crawl(href) {
  let baseUrl;
  try {
    baseUrl = new URL(href);
  } catch {
    return;
  }

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:")
    return;
  if (data.crawled.includes(baseUrl.href) || data.crawling.includes(baseUrl.href))
    return;

  data.crawling.push(baseUrl.href);

  console.log(`Crawling \`${baseUrl}'`)

  const httpx = baseUrl.protocol === "http:" ? http : https;
  httpx.get(baseUrl, res => {
    crawl(res.headers.location);

    let binData = [];

    res.on("error", () => {
      data.crawling.splice(data.crawling.indexOf(baseUrl), 1);
      crawl(baseUrl);
    })
    res.on("data", chunk => { binData.push(chunk) });
    res.on("end", () => {
      const buffer = Buffer.concat(binData);
      const textData = buffer.toString("utf8");

      const matches = [];

      function matchRegex(_1, _2, match2) {
        try {
          let matchHref = new URL(match2, baseUrl).href;

          if (!matches.includes(matchHref)) matches.push(matchHref);
        } catch {}
      }

      textData.replace(/(?:cite|href|src)\s*=\s*(["'])(.*?)\1/gis, matchRegex);
      textData.replace(/(["'`])(https?:\/\/.+?\1)/gis, matchRegex);
      textData.replace(/url\((["'])(.*?)\1\)/gis, matchRegex);

      matches.forEach(match => {
        crawl(match);
      })

      const now = Date.now();
      const index = data.crawled.length;

      data.crawled.push(baseUrl.href);
      data.crawledData.push({
        href: baseUrl.href,
        timestamp: now,
        index: index
      });

      data.crawling.splice(data.crawling.indexOf(baseUrl.href), 1);

      fs.writeFileSync(`crawldata/http/${index}`, buffer, { flag: "w" });

      console.log(`Crawled \`${baseUrl.href}'`);
    })
  }).on("error", () => {
    data.crawling.splice(data.crawling.indexOf(baseUrl), 1);
  });
}

const initCrawling = Array.from(data.crawling);
data.crawling = [];

initCrawling.forEach(crawl);

process.on("SIGINT", () => {
  fs.writeFileSync("crawldata/data", JSON.stringify(data), { flag: "w" });
  process.exit();
});

process.on("uncaughtException", err => {
  fs.writeFileSync("crawldata/data", JSON.stringify(data), { flag: "w" });
  console.error(err)
  process.exit();
});
