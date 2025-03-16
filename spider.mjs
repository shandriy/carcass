import * as fs from "node:fs";
import * as http from "node:http";
import * as https from "node:https";

let crawledArr = [];

function crawl(href, inStream, outStream) {
  let url, out = [];

  try {
    url = new URL(href);
  } catch (err) {
    return out;
  }

  console.log(`Crawling \`${url.href}'`);

  const httpx = url.protocol === "http:" ? http : https;

  if (url.protocol !== "https:" && url.protocol !== "http:")
    return;

  httpx.get(url, res => {
    res.setEncoding("utf8");
    let outData = "";

    if (res.headers.location)
      out.push(new URL(res.headers.location, url).href);

    res.on("data", chunk => { outData += chunk });
    res.on("end", () => {
      outData.replace(/(?:cite|href|src)\s*=\s*(["'])(.*?)\1/gis, function(_1, _2, match2) {
        out.push(new URL(match2, url).href);
      });

      let dir = `crawldata/${
          url.protocol.substring(0, url.protocol.length - 1)
        }/${
          encodeURIComponent(url.href)
            .replace(/^https?%3A%2F%2F/i, "")
            .replace(/%2F/g, "/")
        }`;

      fs.mkdirSync(dir, { recursive: true });

      if (!crawledArr.includes(url.href)) {
        outStream.write(`${url.href}\n`);
        crawledArr.push(url.href);
      }

      fs.writeFileSync(`${dir}/${Date.now()}`, outData);

      out.forEach(elem => {
        if (!crawledArr.includes(elem))
          inStream.write(`${elem}\n`);
      });
    });
  });
}

const args = process.argv;
args.splice(0, 2);

fs.mkdirSync("crawldata", { recursive: true });
fs.mkdirSync("crawldata/http", { recursive: true });
fs.mkdirSync("crawldata/https", { recursive: true });

const toCrawl = fs.createWriteStream("crawldata/tocrawl.txt", { flags: "a" });
const crawled = fs.createWriteStream("crawldata/crawled.txt", { flags: "a" });

crawledArr = fs.readFileSync("crawldata/crawled.txt", { encoding: "utf8" }).split("\n");
fs.readFileSync("crawldata/tocrawl.txt", { encoding: "utf8" }).split("\n").forEach(elem => {
  args.push(elem);
})
fs.writeFileSync("crawldata/tocrawl.txt", "");

for (let href of args) {
  crawl(href, toCrawl, crawled);
}
