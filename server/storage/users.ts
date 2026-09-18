import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";
import { InsertUser, User, users } from "@shared/schema";
import type { Role } from "@shared/permissions";

export const usersStorage = {
  // User operations
  async getUsers(): Promise<User[]> {
    return db.query.users.findMany();
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
};
