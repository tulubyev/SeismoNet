import { db, schema } from "../db";
import { eq } from "drizzle-orm";

export const userObjectsStorage = {
  async getUserObjectIds(userId: number): Promise<number[]> {
    const rows = await db.select({ objectId: schema.userObjects.objectId })
      .from(schema.userObjects).where(eq(schema.userObjects.userId, userId));
    return rows.map(r => r.objectId);
  },

  /** Full replacement of the user's object list (staff binding). */
  async setUserObjects(userId: number, objectIds: number[]): Promise<void> {
    await db.transaction(async tx => {
      await tx.delete(schema.userObjects).where(eq(schema.userObjects.userId, userId));
      if (objectIds.length) {
        await tx.insert(schema.userObjects).values(objectIds.map(objectId => ({ userId, objectId })));
      }
    });
  },
};
