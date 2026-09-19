import { and, eq, exists, inArray, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db, schema } from "../db";
import type { Scope } from "./types";

/** `inArray(col, [])` is invalid SQL; an impossible id yields an empty result instead. */
export const NO_ROWS = [-1];

/** `<column> = customerId`, or no condition in "all customers" mode. */
export function customerWhere(scope: Scope, column: PgColumn): SQL | undefined {
  return scope.customerId === null ? undefined : eq(column, scope.customerId);
}

/** Row belongs to the customer through its station (station_id text FK). */
export function stationInCustomer(scope: Scope, stationIdColumn: PgColumn): SQL | undefined {
  if (scope.customerId === null) return undefined;
  return exists(
    db.select({ one: schema.stations.id }).from(schema.stations)
      .where(and(eq(schema.stations.stationId, stationIdColumn), eq(schema.stations.customerId, scope.customerId))),
  );
}

/** Row belongs to the customer through its infrastructure object (object_id integer FK). */
export function objectInCustomer(scope: Scope, objectIdColumn: PgColumn): SQL | undefined {
  if (scope.customerId === null) return undefined;
  return exists(
    db.select({ one: schema.infrastructureObjects.id }).from(schema.infrastructureObjects)
      .where(and(eq(schema.infrastructureObjects.id, objectIdColumn), eq(schema.infrastructureObjects.customerId, scope.customerId))),
  );
}

/** staff narrowing: object id must be one of the bound objects. */
export function objectIdsWhere(scope: Scope, objectIdColumn: PgColumn): SQL | undefined {
  if (!scope.objectIds) return undefined;
  return inArray(objectIdColumn, scope.objectIds.length ? scope.objectIds : NO_ROWS);
}

/** and() over the defined conditions; undefined when none. */
export function andAll(...conds: (SQL | undefined)[]): SQL | undefined {
  const defined = conds.filter((c): c is SQL => c !== undefined);
  return defined.length ? and(...defined) : undefined;
}
