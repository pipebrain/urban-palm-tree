import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Parser, Store, DataFactory } from "n3";
import { buildDataset, sha256 } from "../scripts/import-qudt.mjs";

const ROOT = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), "utf8");
const source = JSON.parse(await read("data/qudt/source.json"));
const turtle = await read("data/qudt/QUDT-all-in-one-OWL.ttl");
const dataset = JSON.parse(await read("public/data/qudt-graph.json"));
const jsonld = JSON.parse(await read("data/qudt/qudt-all.jsonld"));
const raw = new Store(
  new Parser({ format: "Turtle", blankNodePrefix: "qudt-" }).parse(turtle),
);
const Q = "http://qudt.org/schema/qudt/";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const { namedNode, blankNode, literal, quad } = DataFactory;
const idTerm = (id) =>
  id.startsWith("_:") ? blankNode(id.slice(2)) : namedNode(id);
const sort = (values) => [...values].sort();

test("the actual official source and retained release archive match their pins", async () => {
  assert.equal(sha256(turtle), source.sha256);
  assert.equal(
    sha256(
      await readFile(new URL(`data/qudt/${source.archiveFilename}`, ROOT)),
    ),
    source.archiveSha256,
  );
  assert.equal(raw.size, 132166);
  assert.match(
    await read("data/qudt/LICENSE.md"),
    /Attribution should be made to QUDT.org/,
  );
});

test("generated expanded JSON-LD retains every source triple, literal datatype, language, and blank node", () => {
  const restored = new Store();
  for (const record of jsonld["@graph"]) {
    const subject = idTerm(record["@id"]);
    for (const [property, values] of Object.entries(record)) {
      if (property === "@id") continue;
      for (const value of values) {
        const predicate = namedNode(
          property === "@type" ? RDF + "type" : property,
        );
        const object =
          property === "@type"
            ? namedNode(value)
            : value["@id"]
              ? idTerm(value["@id"])
              : literal(
                  value["@value"],
                  value["@language"] ?? namedNode(value["@type"]),
                );
        restored.addQuad(quad(subject, predicate, object));
      }
    }
  }
  assert.equal(restored.size, raw.size);
  for (const statement of raw)
    assert.ok(
      restored.has(statement),
      `Lost source triple: ${JSON.stringify(statement.toJSON())}`,
    );
});

test("the visible imported universe equals every explicit QuantityKind and PhysicalConstant, including deprecated records", () => {
  const eligible = new Set(
    [Q + "QuantityKind", Q + "PhysicalConstant"].flatMap((type) =>
      raw.getSubjects(RDF + "type", type, null).map((term) => term.value),
    ),
  );
  assert.deepEqual(sort(dataset.nodes.map((node) => node.id)), sort(eligible));
  assert.equal(dataset.nodes.length, 1555);
  assert.equal(
    dataset.nodes.filter((node) => node.kind === "constant").length,
    331,
  );
  assert.equal(dataset.nodes.filter((node) => node.deprecated).length, 100);
  assert.equal(
    new Set(dataset.nodes.map((node) => node.id)).size,
    dataset.nodes.length,
  );
  assert.ok(
    dataset.nodes.every(
      (node) => node.kind !== "equation" && !node.classification,
    ),
  );
});

test("unit identities are complete references, never visible graph nodes or implied use backlinks", () => {
  const sourceUnits = raw
    .getSubjects(RDF + "type", Q + "Unit", null)
    .map((term) => term.value);
  assert.deepEqual(
    sort(dataset.units.map((unit) => unit.id)),
    sort(sourceUnits),
  );
  const unitIds = new Set(sourceUnits);
  for (const node of dataset.nodes) {
    assert.ok(!unitIds.has(node.id));
    for (const id of [...node.unitIds, ...node.applicableUnitIds])
      assert.ok(unitIds.has(id), `Missing reference unit ${id}`);
    if (node.kind === "quantity") assert.deepEqual(node.unitIds, []);
  }
  const fahrenheit = dataset.units.find(
    (unit) => unit.id === "http://qudt.org/vocab/unit/DEG_F",
  );
  assert.equal(fahrenheit.offset, "459.67");
  assert.ok(!unitIds.has("http://qudt.org/vocab/unit/DELTA_DEG_F"));
});

test("every learning edge is an explicit source assertion with existing endpoints and stable identity", () => {
  const nodeIds = new Set(dataset.nodes.map((node) => node.id));
  assert.equal(
    new Set(dataset.edges.map((edge) => edge.id)).size,
    dataset.edges.length,
  );
  for (const edge of dataset.edges) {
    assert.ok(nodeIds.has(edge.source) && nodeIds.has(edge.target));
    assert.ok(
      raw.countQuads(edge.source, edge.predicate, edge.target, null) > 0,
    );
    assert.ok(
      ![Q + "hasDimensionVector", Q + "applicableUnit"].includes(
        edge.predicate,
      ),
    );
    assert.equal(edge.provenance.origin, "qudt");
  }
});

test("constants retain source precision and uncertainty without claiming a reviewed current value", () => {
  const planck = dataset.nodes.find(
    (node) => node.id === "http://qudt.org/vocab/constant/PlanckConstant",
  );
  assert.equal(
    planck.constantValues[0].value,
    "0.000000000000000000000000000000000662606896",
  );
  assert.equal(
    planck.constantValues[0].standardUncertainty,
    "0.000000000000000000000000000000000000000033",
  );
  assert.match(planck.assumptions[0], /independent review/);
});

test("regeneration is deterministic and rejects a mismatched release identity", () => {
  const regenerated = buildDataset(turtle, source);
  assert.deepEqual(JSON.parse(JSON.stringify(regenerated.dataset)), dataset);
  // Hash large data to keep a failure useful instead of printing 13 MB of RDF.
  assert.equal(
    sha256(JSON.stringify(regenerated.jsonld)),
    sha256(JSON.stringify(jsonld)),
  );
  const repeated = buildDataset(turtle, source);
  assert.equal(
    sha256(JSON.stringify(repeated.jsonld)),
    sha256(JSON.stringify(jsonld)),
  );
  assert.throws(
    () => buildDataset(turtle, { ...source, version: "0.0.0" }),
    /does not match/,
  );
});
