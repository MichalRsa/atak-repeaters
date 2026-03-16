import fs from "fs/promises";
import path from "path";

import { XMLParser, XMLBuilder } from "fast-xml-parser";

const xml = await fs.readFile("przemienniki.kml", "utf8");

const parser = new XMLParser({
  ignoreAttributes: false,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
});

const data = parser.parse(xml);

console.log(data.kml.Document.Style);

// return;
// console.dir(data.kml.Document.Style, {
//   depth: null,
//   colors: true,
// });

const ICON_DIR = "./output/icons";

async function downloadFile(url, dest) {
  console.log(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFile(dest, buffer);
}

async function localizeIcons(styles) {
  fs.mkdir(ICON_DIR, { recursive: true });

  for (const style of styles) {
    const url = style.IconStyle.Icon.href;

    const filename = path.basename(url);
    const filepath = path.join("./output/icons/", filename);

    // download
    await downloadFile(url, filepath);

    // update KML href
    style.IconStyle.Icon.href = `icons/${filename}`;
  }

  data.kml.Document.Style = styles;

  const outputFile = builder.build(data);
  fs.writeFile("./output/repeaters.kml", outputFile);
  return styles;
}

const styleArray = data.kml.Document.Style;

const updatedStyles = await localizeIcons(styleArray);
console.log(updatedStyles);
