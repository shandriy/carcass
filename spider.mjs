import * as fs from "node:fs";
import * as http from "node:http";
import * as https from "node:https";

let data = {
  crawled: [],
  crawledData: [],
  toCrawl: []
}

if (fs.existsSync("crawldata/data")) {
  data = JSON.parse(fs.readFileSync("crawldata/data", { encoding: "utf8" }));
}

const currentCrawl = Array.from(data.toCrawl);
data.toCrawl = [];

let currentCrawlCounter = 0;
const currentCrawlLength = currentCrawl.length;

currentCrawl.forEach(href => {
  let requestReached = false

  const baseUrl = new URL(href);

  console.log(`Crawling \`${baseUrl.href}'`);

  const httpx = baseUrl.protocol === "http:" ? http : https;

  setTimeout(() => {
    if (!requestReached) {
      console.log(`Skipping \`${baseUrl.href}'`);

      currentCrawlCounter++;
      if (currentCrawlCounter >= currentCrawlLength) {
        fs.writeFileSync("crawldata/data", JSON.stringify(data));
        process.exit();
      }
    }
  }, 10000)

  httpx.get(baseUrl, res => {
    requestReached = true;

    try {
      let locationUrl = new URL(res.headers.location);
  
      if (locationUrl.protocol === "http:" || locationUrl.protocol === "https:")
        if (!data.crawled.includes(locationUrl.href) && !currentCrawl.includes(locationUrl.href))
          data.toCrawl.push(locationUrl.href);
    } catch {}

    let textData = "";
    res.setEncoding("utf8");

    res.on("error", () => {
      currentCrawlCounter++
      if (currentCrawlCounter >= currentCrawlLength) {
        fs.writeFileSync("crawldata/data", JSON.stringify(data));
        process.exit();
      }
    })
    res.on("data", chunk => { textData += chunk });
    res.on("end", () => {
      textData.replace(/(?:cite|href|src)\s*=\s*(["'])(.*?)\1/gis, function(_1, _2, match2) {
        let matchUrl;

        try {
          matchUrl = new URL(match2, baseUrl);

          if (matchUrl.protocol !== "http:" && matchUrl.protocol !== "https:")
            return;

          if (!data.crawled.includes(matchUrl.href) && !currentCrawl.includes(matchUrl.href))
            data.toCrawl.push(matchUrl.href);
        } catch (err) {
          console.warn(err.message);
        }
      });

      const now = Date.now();
      const index = data.crawled.length;

      data.crawled.push(baseUrl.href);
      data.crawledData.push({
        href: baseUrl.href,
        timestamp: now,
        index: index
      })

      fs.writeFileSync(`crawldata/http/${index}`, textData);

      console.log(`Crawled \`${baseUrl.href}'`);

      currentCrawlCounter++;
      if (currentCrawlCounter >= currentCrawlLength) {
        fs.writeFileSync("crawldata/data", JSON.stringify(data));
        process.exit();
      }
    });
  })
});
