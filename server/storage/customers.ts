import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";
import type { Customer, InsertCustomer } from "@shared/schema";

export const customersStorage = {
  async getCustomers(): Promise<Customer[]> {
    return db.query.customers.findMany({ orderBy: (t, { asc }) => [asc(t.name)] });
  },
  async getCustomer(id: number): Promise<Customer | undefined> {
    return db.query.customers.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  },
  async getCustomerByCode(code: string): Promise<Customer | undefined> {
    return db.query.customers.findFirst({ where: (t, { eq }) => eq(t.code, code.trim().toLowerCase()) });
  },
  async createCustomer(c: InsertCustomer): Promise<Customer> {
    const [row] = await db.insert(schema.customers).values({ ...c, code: c.code.trim().toLowerCase() }).returning();
    return row;
  },
  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const { code: _code, ...rest } = data; // code is immutable after creation
    const [row] = await db.update(schema.customers).set(rest).where(eq(schema.customers.id, id)).returning();
    return row;
  },
  /** For the admin table: how many objects and users the customer owns. */
  async countCustomerRows(id: number): Promise<{ objects: number; users: number }> {
    const [o] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.infrastructureObjects).where(eq(schema.infrastructureObjects.customerId, id));
    const [u] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(eq(schema.users.customerId, id));
    return { objects: o?.n ?? 0, users: u?.n ?? 0 };
  },
};
