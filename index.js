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

// console.log(data.kml.Document.Folder);
// console.log(data.kml.Document.Style);

// console.dir(data.kml.Document.Folder[0].Folder[0].Folder[0], {
//   depth: null,
//   colors: true,
// });
// Iterate over each country
data.kml.Document.Folder.forEach((country) => {
  if (!Array.isArray(country.Folder)) return; // skip if no frequencies

  // Iterate over each frequency
  country.Folder.forEach((frequency) => {
    if (!frequency.Folder) return; // skip if no repeaters

    // Handle single object vs array
    let repeaters = Array.isArray(frequency.Folder)
      ? frequency.Folder
      : [frequency.Folder];

    // Keep only "działający"
    repeaters = repeaters.filter((r) => {
      const nameValue = Array.isArray(r.name) ? r.name[0] : r.name;
      return nameValue === "działający";
    });

    // Assign back, preserving single object if only one left
    frequency.Folder = repeaters.length === 1 ? repeaters[0] : repeaters;
  });
});

// process.exit(0);

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

  return styles;
}

async function addAltitude() {}

const styleArray = data.kml.Document.Style;

const updatedStyles = await localizeIcons(styleArray);
console.log(updatedStyles);

const outputFile = builder.build(data);
fs.writeFile("./output/repeaters.kml", outputFile);

