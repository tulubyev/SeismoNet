import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";
import { InsertUser, User, users } from "@shared/schema";
import type { Role } from "@shared/permissions";
import type { Scope } from "./types";

export class LastSuperadminError extends Error {
  constructor() { super("Нельзя убрать последнего активного суперадмина"); this.name = "LastSuperadminError"; }
}

/** Pure decision used inside the guarded update; exported for tests. */
export function removesLastSuperadmin(
  target: Pick<User, "id" | "role" | "active">,
  patch: Partial<Pick<InsertUser, "role" | "active">>,
  activeSuperadminIds: number[],
): boolean {
  if (target.role !== "superadmin" || !target.active) return false;
  const losesRole = patch.role !== undefined && patch.role !== "superadmin";
  const losesActive = patch.active === false;
  if (!losesRole && !losesActive) return false;
  return activeSuperadminIds.filter(id => id !== target.id).length === 0;
}

export const usersStorage = {
  // User operations
  async getUsers(scope: Scope): Promise<User[]> {
    return db.query.users.findMany({
      where: scope.customerId === null ? undefined : (t, { eq }) => eq(t.customerId, scope.customerId!),
    });
  },
  
  async getUser(id: number): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id)
    });
  },
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [u] = await db.select().from(schema.users).where(sql`lower(${schema.users.username}) = lower(${username})`).limit(1);
    return u;
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [u] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = lower(${email})`).limit(1);
    return u;
  },
  
  async createUser(user: InsertUser): Promise<User> {
    const now = new Date();
    const userWithTimestamps = {
      ...user,
      createdAt: now,
      updatedAt: now,
      lastLogin: null
    };
    const [newUser] = await db.insert(schema.users).values(userWithTimestamps).returning();
    return newUser;
  },
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser;
  },
  
  async updateUserRole(id: number, role: Role): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        role,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser;
  },
  
  async updateUserStatus(id: number, active: boolean): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        active,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser;
  },

  async setLastLogin(id: number): Promise<void> {
    await db.update(schema.users).set({ lastLogin: new Date(), updatedAt: new Date() }).where(eq(schema.users.id, id));
  },

  /** Invalidate every session of the user (see sessionUserFrom in server/auth.ts). */
  async bumpSessionEpoch(id: number): Promise<User | undefined> {
    const [u] = await db.update(schema.users)
      .set({ sessionEpoch: sql`${schema.users.sessionEpoch} + 1`, updatedAt: new Date() })
      .where(eq(schema.users.id, id)).returning();
    return u;
  },

  /**
   * Update with the "last active superadmin" invariant enforced inside one
   * transaction: the active superadmin rows are locked FOR UPDATE, so two
   * concurrent demotions cannot both pass the count check.
   */
  async updateUserGuarded(id: number, patch: Partial<InsertUser>): Promise<User | undefined> {
    return db.transaction(async tx => {
      const locked = await tx.execute(sql`SELECT id FROM users WHERE role = 'superadmin' AND active FOR UPDATE`);
      const activeIds = ((locked as unknown as { rows?: Array<{ id: number | string }> }).rows ?? []).map(r => Number(r.id));
      const [target] = await tx.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
      if (!target) return undefined;
      if (removesLastSuperadmin(target, patch, activeIds)) throw new LastSuperadminError();
      const [updated] = await tx.update(schema.users).set({ ...patch, updatedAt: new Date() }).where(eq(schema.users.id, id)).returning();
      return updated;
    });
  },
};
