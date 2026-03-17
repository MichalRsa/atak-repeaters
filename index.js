import fs from "fs/promises";
import path from "path";

import { XMLBuilder } from "fast-xml-parser";
import { downloadFile, getAltitude, kmlToObject } from "./utils.js";

// const xml = await fs.readFile("przemienniki.kml", "utf8");

const builder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
});

const data = await kmlToObject("przemienniki.kml");

// process.exit(0);
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

const ICON_DIR = "./output/icons";

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

const styleArray = data.kml.Document.Style;

await localizeIcons(styleArray);

// Simple delay function
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Loop through each country sequentially
for (const country of data.kml.Document.Folder) {
  if (!Array.isArray(country.Folder)) {
    console.log("country is not an array");
    continue;
  }

  console.log("Processing country");

  // Loop through each frequency sequentially
  for (const frequency of country.Folder) {
    if (!frequency.Folder) {
      console.log("No repeaters on " + frequency.name + " frequency");
      continue;
    }

    const statusFolder = frequency.Folder; // object, not array

    if (!statusFolder.Placemark) {
      console.log(
        "Folder exists, but no repeaters assigned to " + frequency.name,
      );
      continue;
    }

    const placemarks = Array.isArray(statusFolder.Placemark)
      ? statusFolder.Placemark
      : [statusFolder.Placemark];

    // Process each placemark **sequentially with delay**
    for (const placemark of placemarks) {
      console.log("Placemark iteration");

      const description = placemark.description || "";
      const match = description.match(/href="([^"]+)"/);
      if (!match) continue;

      console.log("Matched URL");
      const url = match[1];
      console.log("URL:", url);

      // Await the API call
      const altitude = await getAltitude(url);
      console.log("Altitude:", altitude);
      if (!altitude) continue;

      const coords = placemark.Point?.coordinates.split(",");
      if (!coords) {
        console.log("No coords");
        continue;
      }

      const stringAltitude = altitude.toString();
      if (coords.length === 2) {
        coords.push(stringAltitude);
      } else {
        coords[2] = stringAltitude;
      }

      placemark.Point.coordinates = coords.join(",");
      console.log("Updated coords:", placemark.Point.coordinates);

      // Delay before next request (adjust ms as needed)
      await delay(200); // 200ms delay between API calls
    }
  }
}

const outputFile = builder.build(data);
fs.writeFile("./output/repeaters.kml", outputFile);
