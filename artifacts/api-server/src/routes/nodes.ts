import { Router, type IRouter } from "express";
import { db, nodesTable, insertNodeSchema, patchNodeSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const uuidSchema = z.string().uuid("Invalid UUID format");

function validateId(id: string): string | null {
  const result = uuidSchema.safeParse(id);
  return result.success ? result.data : null;
}

router.get("/nodes", async (_req, res) => {
  try {
    const nodes = await db.select().from(nodesTable).orderBy(nodesTable.createdAt);
    res.json(nodes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch nodes";
    res.status(500).json({ error: message });
  }
});

router.post("/nodes", async (req, res) => {
  try {
    const parsed = insertNodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const [node] = await db.insert(nodesTable).values(parsed.data).returning();
    res.status(201).json(node);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create node";
    res.status(500).json({ error: message });
  }
});

router.get("/nodes/:id", async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid node ID format" });
      return;
    }
    const [node] = await db.select().from(nodesTable).where(eq(nodesTable.id, id));
    if (!node) {
      res.status(404).json({ error: "Node not found" });
      return;
    }
    res.json(node);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch node";
    res.status(500).json({ error: message });
  }
});

router.patch("/nodes/:id", async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid node ID format" });
      return;
    }
    const parsed = patchNodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "No fields provided for update" });
      return;
    }
    const [node] = await db
      .update(nodesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(nodesTable.id, id))
      .returning();
    if (!node) {
      res.status(404).json({ error: "Node not found" });
      return;
    }
    res.json(node);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update node";
    res.status(500).json({ error: message });
  }
});

router.delete("/nodes/:id", async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid node ID format" });
      return;
    }
    const [node] = await db.delete(nodesTable).where(eq(nodesTable.id, id)).returning();
    if (!node) {
      res.status(404).json({ error: "Node not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete node";
    res.status(500).json({ error: message });
  }
});

export default router;
