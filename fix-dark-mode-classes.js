import fs from "fs";
import { glob } from "glob";

// Map of old classes to new classes
const replacements = {
  "dark:bg-dark-primary": "dark:bg-darkTheme-primary",
  "dark:bg-dark-secondary": "dark:bg-darkTheme-secondary",
  "dark:bg-dark-accent": "dark:bg-darkTheme-accent",
  "dark:text-dark-text": "dark:text-darkTheme-text",
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let hasChanged = false;

  // Perform replacements
  for (const [oldClass, newClass] of Object.entries(replacements)) {
    if (content.includes(oldClass)) {
      content = content.replace(new RegExp(oldClass, "g"), newClass);
      hasChanged = true;
    }
  }

  // Write the file back if changed
  if (hasChanged) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

// Find all relevant files
const files = await glob("src/**/*.{tsx,jsx,ts,js}");
files.forEach(processFile);
