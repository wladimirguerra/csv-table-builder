#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env
// deno-lint-ignore-file no-explicit-any

import {parseArgs} from "jsr:@std/cli/parse-args";
import {readCSV, writeCSV} from "jsr:@vslinko/csv";
import * as Colors from "https://deno.land/std@0.224.0/fmt/colors.ts";

import * as path from "https://deno.land/std@0.188.0/path/mod.ts";

/// UTILITIES:BEG

async function getJson(filePath: string) {
  return JSON.parse(await Deno.readTextFile(filePath));
}

// Override console methods to add colors

console.info = (...args: any[]) => console.log(...args.map((o:object) => Colors.green(JSON.stringify(o))));
console.error = (...args: any[]) => console.log(...args.map((o:object) => Colors.red(JSON.stringify(o))));
console.warn = (...args: any[]) => console.log(...args.map((o:object) => Colors.yellow(JSON.stringify(o))));
console.debug = (...args: any[]) => console.log(...args.map((o:object) => Colors.blue(JSON.stringify(o))));


/**
 * Access nested object properties by path.
 * @param path
 * @param object
 */
const access = (path:string, object: Record<string, any>) => {
  return path.split('.').reduce((o, i) => o[i], object)
}

/// UTILITIES:END

const flags = parseArgs(Deno.args, {
  boolean: ["help"],
  string: ["template", "map", "key"],
});

const helpMessage = `
    Usage: build-table.ts [options] [json-file] [output-file]

    Options:
      --help        Show this help
      --template    csv template file. Required.
      --key         json key within the json file that value will be used to build the table. Default is the root object.
  `

//VALIDATION:BEG

if (flags.help) {
  console.log(helpMessage)
  Deno.exit(0)
}

if (!flags.template) {
  console.error("\nMissing --template option");
  console.log(helpMessage);
  Deno.exit(1);
}

if (!flags._[0]) {
  console.error("\nMissing json file argument");
  console.log(helpMessage);
  Deno.exit(1);
}

if (!flags._[1]) {
  console.error("\nMissing output file argument");
  console.log(helpMessage);
  Deno.exit(1);
}

if(typeof flags._[1] !== "string") {
  console.error("Invalid output file path");
  Deno.exit(1);
}

//VALIDATION:END

let templateFile: Deno.FsFile

const templatePath = path.join('/templates',`${flags.template}.csv`);

try {
  // Try to open the template file from the templates folder
  templateFile = await Deno.open(templatePath);
} catch (e) {
  console.error(`Error opening template file ${templatePath}. Trying ${flags.template}`, e);
  try {
    templateFile = await Deno.open(flags.template);
  } catch (e) {
    console.error(`Error opening template file ${flags.template}`, e);
    Deno.exit(1);
  }
}

/**
 * The csv header that will be used to build the table.
 */
const header: string[] = [];
/**
 * The map between the csv header and the json keys.
 */
const keysMap: string[] = [];

// Row counter helper
let rowCounter = 0;

// Read the template file
try {
  console.info("Reading template file...");
  for await (const row of readCSV(templateFile)) {
    if (rowCounter > 1) {
      // Break after the second row
      // The template file should have only two rows
      console.warn("Template file should have only two rows");
      break;
    }

    for await (const cell of row) {
      if (rowCounter === 0) {
        header.push(cell);
      } else {
        keysMap.push(cell);
      }
    }
    rowCounter++;
  }
  console.info("Template file read successfully");
} catch (e) {
  console.error("Error reading template file", e);
  Deno.exit(1);
} finally {
  templateFile.close();
}

if(typeof flags._[0] !== "string") {
  console.error("Error reading json file. Invalid json file path");
  Deno.exit(1);
}

const module = await getJson(flags._[0] /* the first argument that is not an option */);

/**
 * The json object that will be used to build the table.
 */
const json = flags.key ? access(flags.key,module) : module;

if (flags.key && !json) {
  console.error(`Error reading json file. Key ${flags.key} not found`);
  Deno.exit(1);
}

if (!json) {
  console.error("Error reading json file");
  Deno.exit(1);
}

/**
 * The csv data that will be used to build the table.
 * The first row is the header.
 * The first column are the resource's identifiers assessed.
 */
const csvData: string[][] = [
  ["Name", ...header]
];

for (const [key, value] of Object.entries(json)) {
  const row: string[] = [key];

  if(typeof value !== "object") {
    console.warn(`${flags.key?`${flags.key}.`:''}${key} is not an object. Skipping...`);
    continue;
  }

  for (const k of keysMap) {
    row.push(`${(access(k,<Record<string,any>>value))}`);
  }
  csvData.push(row);
}

try {
  const file = await Deno.create(flags._[1]);

  await writeCSV(file, csvData);

} catch (e) {
  console.error(`Error writing csv file ${flags._[1]}`, e);
  Deno.exit(1);
}
