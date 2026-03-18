import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import fs from "fs/promises";

export async function getAltitude(url) {
  const res = await fetch(url);
  const html = await res.text();

  const $ = cheerio.load(html);

  let altitude = null;

  $("tr").each((i, el) => {
    const label = $(el).find("td").first().text().trim();

    if (label.includes("Wysokość n.p.m.:")) {
      const value = $(el).find("td").last().text().trim();
      altitude = parseInt(value);
    }
  });

  return altitude;
}

export async function downloadFile(url, dest) {
  console.log(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFile(dest, buffer);
}

export function isArray(item) {
  return Array.isArray(item);
}
export function isObject(item) {
  return typeof item === "object" && value !== null && !Array.isArray(value);
}

export async function kmlToObject(filePath) {
  const xml = await fs.readFile(filePath, "utf8");

  const parser = new XMLParser({
    ignoreAttributes: false,
  });

  const data = parser.parse(xml);

  return data;
}
