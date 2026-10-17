// Local browser QA only. output/ is ignored and must never be committed.
import { mkdir, writeFile } from "node:fs/promises";
const origin = "http://localhost:3000";
const result = await fetch(origin + "/api/auth/sign-in/email", {
  method: "POST",
  headers: { "content-type": "application/json", origin },
  body: JSON.stringify({
    email: process.env.SPS_USER_EMAIL,
    password: process.env.SPS_BOOTSTRAP_PASSWORD,
  }),
});
if (!result.ok) throw new Error("Local browser sign-in failed.");
const cookies = result.headers.getSetCookie().map((raw) => {
  const [pair, ...attributes] = raw.split(";");
  const separator = pair.indexOf("=");
  return {
    name: pair.slice(0, separator),
    value: pair.slice(separator + 1),
    domain: "localhost",
    path: "/",
    expires: -1,
    httpOnly: attributes.some((a) => a.trim().toLowerCase() === "httponly"),
    secure: attributes.some((a) => a.trim().toLowerCase() === "secure"),
    sameSite: "Lax",
  };
});
await mkdir("output", { recursive: true });
await writeFile(
  "output/browser-state.json",
  JSON.stringify({ cookies, origins: [] }),
);
console.log("Local browser session prepared in ignored output directory.");
