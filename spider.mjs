import * as fs from "node:fs";
import * as http from "node:http";
import * as https from "node:https";

let data = {
  files: 0,
  crawled: [],
  crawling: [],
  crawl: []
}

if (fs.existsSync("crawldata/data")) {
  data = JSON.parse(fs.readFileSync("crawldata/data", { encoding: "utf8", flag: "r" }));
}

function toCrawl(href) {
  setTimeout(() => {
    if (data.crawling.length < 1000)
      crawl(href);
    else
      if (data.crawl.length < 100000)
        data.crawl.push(href);
  }, 3000)
}

function splice(href) {
  data.crawling.splice(data.crawling.indexOf(href), 1);

  if (data.crawling.length < 1000) {
    crawl(data.crawl[0]);
    data.crawl.splice(0, 1);
  }
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
  const req = httpx.get(baseUrl, res => {
    toCrawl(res.headers.location);

    let binData = [];

    res.on("error", () => {
      splice(baseUrl.href);
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
      textData.replace(/(["'`])(https?:\/\/.+?)\1/gis, matchRegex);
      textData.replace(/url\((["'])(.*?)\1\)/gis, matchRegex);

      matches.forEach(match => {
        toCrawl(match);
      })

      const now = Date.now();
      const index = data.files;

      data.crawled.push(baseUrl.href);
      if (data.crawled > 10000)
        data.crawled.splice(0, 1);

      splice(baseUrl.href);

      fs.writeFileSync(`crawldata/http/${index}`, JSON.stringify({
        href: baseUrl.href,
        status: res.statusCode,
        type: res.headers["content-type"],
        timestamp: now,
        index: index,
        data: buffer.toString("base64")
      }), { flag: "w" });

      data.files++;

      console.log(`Crawled \`${baseUrl.href}'`);
    })
  }).on("error", () => {
    splice(baseUrl.href);
  });

  setTimeout(() => {
    req.destroy(true);
    console.log(`Request to \`${baseUrl.href}' timed out`);
  }, 300000);
}

setInterval(() => {
  fs.writeFileSync("crawldata/data", JSON.stringify(data), { flag: "w" });
}, 60000);

const initCrawling = Array.from(data.crawling);
data.crawling = [];

initCrawling.forEach(crawl);

process.on("SIGINT", () => {
  fs.writeFileSync("crawldata/data", JSON.stringify(data), { flag: "w" });
  process.exit();
});

process.on("uncaughtException", err => {
  fs.writeFileSync("crawldata/data", JSON.stringify(data), { flag: "w" });
  console.error(err);
  process.exit();
});

process.on("exit", () => {
  fs.writeFileSync("crawldata/data", JSON.stringify(data), { flag: "w" });
  process.exit();
})
