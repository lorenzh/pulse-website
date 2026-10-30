import { readFileSync, writeFileSync } from "node:fs";
import { generateTokensCss, type Tokens } from "../src/build/tokens-css.ts";

const tokens = JSON.parse(readFileSync("design/losoft-tokens.json", "utf8")) as Tokens;
writeFileSync("src/styles/tokens.css", generateTokensCss(tokens));
console.log("wrote src/styles/tokens.css");
