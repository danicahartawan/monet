import { Router, type IRouter } from "express";
import { db, edgesTable, insertEdgeSchema, patchEdgeSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

function isFkViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, unknown>;
  if (e.code === "23503") return true;
  if (typeof e.cause === "object" && e.cause !== null) {
    const cause = e.cause as Record<string, unknown>;
    if (cause.code === "23503") return true;
  }
  return false;
}

const router: IRouter = Router();

const uuidSchema = z.string().uuid("Invalid UUID format");

function validateId(id: string): string | null {
  const result = uuidSchema.safeParse(id);
  return result.success ? result.data : null;
}

router.get("/edges", async (_req, res) => {
  try {
    const edges = await db.select().from(edgesTable).orderBy(edgesTable.createdAt);
    res.json(edges);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch edges";
    res.status(500).json({ error: message });
  }
});

router.post("/edges", async (req, res) => {
  try {
    const parsed = insertEdgeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const [edge] = await db.insert(edgesTable).values(parsed.data).returning();
    res.status(201).json(edge);
  } catch (err) {
    if (isFkViolation(err)) {
      res.status(400).json({ error: "One or more referenced node IDs do not exist" });
      return;
    }
    const message = err instanceof Error ? err.message : "Failed to create edge";
    res.status(500).json({ error: message });
  }
});

router.get("/edges/:id", async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid edge ID format" });
      return;
    }
    const [edge] = await db.select().from(edgesTable).where(eq(edgesTable.id, id));
    if (!edge) {
      res.status(404).json({ error: "Edge not found" });
      return;
    }
    res.json(edge);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch edge";
    res.status(500).json({ error: message });
  }
});

router.patch("/edges/:id", async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid edge ID format" });
      return;
    }
    const parsed = patchEdgeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "No fields provided for update" });
      return;
    }
    const [edge] = await db
      .update(edgesTable)
      .set(parsed.data)
      .where(eq(edgesTable.id, id))
      .returning();
    if (!edge) {
      res.status(404).json({ error: "Edge not found" });
      return;
    }
    res.json(edge);
  } catch (err) {
    if (isFkViolation(err)) {
      res.status(400).json({ error: "One or more referenced node IDs do not exist" });
      return;
    }
    const message = err instanceof Error ? err.message : "Failed to update edge";
    res.status(500).json({ error: message });
  }
});

router.delete("/edges/:id", async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid edge ID format" });
      return;
    }
    const [edge] = await db.delete(edgesTable).where(eq(edgesTable.id, id)).returning();
    if (!edge) {
      res.status(404).json({ error: "Edge not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete edge";
    res.status(500).json({ error: message });
  }
});

export default router;
