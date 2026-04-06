import { Router, type IRouter } from "express";
import { db, nodesTable, edgesTable } from "@workspace/db";
import archiver from "archiver";

const router: IRouter = Router();

function yamlStr(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  return `"${escaped}"`;
}

router.get("/export/json", async (_req, res) => {
  try {
    const [nodes, edges] = await Promise.all([
      db.select().from(nodesTable).orderBy(nodesTable.createdAt),
      db.select().from(edgesTable).orderBy(edgesTable.createdAt),
    ]);

    const graph = { nodes, edges };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=\"graph.json\"");
    res.json(graph);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    res.status(500).json({ error: message });
  }
});

router.get("/export/markdown", async (_req, res) => {
  try {
    const [nodes, edges] = await Promise.all([
      db.select().from(nodesTable).orderBy(nodesTable.createdAt),
      db.select().from(edgesTable).orderBy(edgesTable.createdAt),
    ]);

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=\"graph-export.zip\"");

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      } else {
        res.destroy(err);
      }
    });

    archive.pipe(res);

    for (const node of nodes) {
      const outgoingEdges = edges.filter((e) => e.sourceNodeId === node.id);
      const incomingEdges = edges.filter((e) => e.targetNodeId === node.id);

      const connections: string[] = [];
      for (const edge of outgoingEdges) {
        const target = nodeMap.get(edge.targetNodeId);
        if (target) {
          if (edge.label) {
            connections.push(`  - target: ${yamlStr(target.title)}\n    relation: ${yamlStr(edge.label)}`);
          } else {
            connections.push(`  - target: ${yamlStr(target.title)}`);
          }
        }
      }
      for (const edge of incomingEdges) {
        const source = nodeMap.get(edge.sourceNodeId);
        if (source) {
          if (edge.label) {
            connections.push(`  - source: ${yamlStr(source.title)}\n    relation: ${yamlStr(edge.label)}`);
          } else {
            connections.push(`  - source: ${yamlStr(source.title)}`);
          }
        }
      }

      const frontmatter = [
        "---",
        `id: ${yamlStr(node.id)}`,
        `title: ${yamlStr(node.title)}`,
        `created_at: ${yamlStr(node.createdAt.toISOString())}`,
        `updated_at: ${yamlStr(node.updatedAt.toISOString())}`,
        connections.length > 0 ? `connections:\n${connections.join("\n")}` : "connections: []",
        "---",
        "",
      ].join("\n");

      const fileContent = frontmatter + node.content;
      const safeName = node.title.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 80);
      const filename = `${safeName}_${node.id.slice(0, 8)}.md`;

      archive.append(fileContent, { name: filename });
    }

    await archive.finalize();
  } catch (err) {
    if (!res.headersSent) {
      const message = err instanceof Error ? err.message : "Export failed";
      res.status(500).json({ error: message });
    } else {
      res.destroy(err instanceof Error ? err : new Error(String(err)));
    }
  }
});

export default router;
