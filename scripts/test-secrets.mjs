import { build } from "esbuild";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
const file = path.resolve(".sites-runtime/secret-tests.cjs");
await build({
  entryPoints: ["lib/secret-crypto.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: file,
  logLevel: "silent",
});
const { encryptionKey, sealSecret, openSecret } = createRequire(
    import.meta.url,
  )(file),
  key = randomBytes(32).toString("base64"),
  token = "fake-test-token-not-a-real-credential";
const a = sealSecret("NOVA_POSHTA_API_KEY", token, key),
  b = sealSecret("NOVA_POSHTA_API_KEY", token, key);
assert.notEqual(a, b);
assert.ok(!a.includes(token));
assert.equal(openSecret("NOVA_POSHTA_API_KEY", a, key), token);
assert.throws(
  () => openSecret("MONOBANK_TOKEN", a, key),
  /SECRET_DECRYPTION_FAILED/,
);
assert.throws(
  () =>
    openSecret("NOVA_POSHTA_API_KEY", a, randomBytes(32).toString("base64")),
  /SECRET_DECRYPTION_FAILED/,
);
const altered = JSON.parse(a);
altered.data = Buffer.from("tampered").toString("base64");
assert.throws(
  () => openSecret("NOVA_POSHTA_API_KEY", JSON.stringify(altered), key),
  /SECRET_DECRYPTION_FAILED/,
);
assert.throws(() => encryptionKey(undefined), /ENCRYPTION_NOT_CONFIGURED/);
assert.throws(() => encryptionKey("short"), /ENCRYPTION_NOT_CONFIGURED/);
console.log(
  "PASS: AES-256-GCM roundtrip, randomized IV, ciphertext tampering, provider binding, wrong/missing master key. No real credentials used.",
);

const resolverFile = path.resolve(".sites-runtime/resolver-tests.cjs");
await build({
  stdin: {
    contents:
      'export {integrationSecrets} from "./lib/integration-secrets";export {configure} from "./lib/server";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: resolverFile,
  logLevel: "silent",
  plugins: [
    {
      name: "isolated-test-db",
      setup(b) {
        b.onResolve({ filter: /server/ }, (args) => {
          if (args.path === "server-only")
            return { path: "empty", namespace: "test" };
          if (["./server", "./lib/server"].includes(args.path))
            return { path: "db", namespace: "test" };
        });
        b.onLoad({ filter: /.*/, namespace: "test" }, (args) => ({
          contents:
            args.path === "empty"
              ? ""
              : "let response=null;export function configure(value){response=value}export function serviceClient(){return response===null?null:{from(){return {select(){return {in:async()=>response}}}}}}",
          loader: "js",
        }));
      },
    },
  ],
});
const { integrationSecrets, configure } = createRequire(import.meta.url)(
  resolverFile,
);
const oldKey = process.env.INTEGRATIONS_ENCRYPTION_KEY,
  oldNP = process.env.NOVA_POSHTA_API_KEY;
try {
  process.env.INTEGRATIONS_ENCRYPTION_KEY = key;
  process.env.NOVA_POSHTA_API_KEY = "environment-fixture";
  configure(null);
  assert.equal(
    (await integrationSecrets(["NOVA_POSHTA_API_KEY"])).NOVA_POSHTA_API_KEY,
    "environment-fixture",
  );
  configure({
    data: [{ id: "NOVA_POSHTA_API_KEY", encrypted_value: a }],
    error: null,
  });
  assert.equal(
    (await integrationSecrets(["NOVA_POSHTA_API_KEY"])).NOVA_POSHTA_API_KEY,
    token,
  );
  configure({
    data: [{ id: "NOVA_POSHTA_API_KEY", encrypted_value: "broken" }],
    error: null,
  });
  assert.equal(
    (await integrationSecrets(["NOVA_POSHTA_API_KEY"])).NOVA_POSHTA_API_KEY,
    "",
  );
  configure({ data: null, error: { code: "42P01" } });
  assert.equal(
    (await integrationSecrets(["NOVA_POSHTA_API_KEY"])).NOVA_POSHTA_API_KEY,
    "environment-fixture",
  );
  configure({ data: null, error: { code: "42501" } });
  await assert.rejects(
    () => integrationSecrets(["NOVA_POSHTA_API_KEY"]),
    /INTEGRATIONS_UNAVAILABLE/,
  );
} finally {
  if (oldKey === undefined) delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
  else process.env.INTEGRATIONS_ENCRYPTION_KEY = oldKey;
  if (oldNP === undefined) delete process.env.NOVA_POSHTA_API_KEY;
  else process.env.NOVA_POSHTA_API_KEY = oldNP;
}
console.log(
  "PASS: encrypted database priority, environment fallback, unreadable secret disables integration without exposing a value, and permission failures fail closed.",
);
