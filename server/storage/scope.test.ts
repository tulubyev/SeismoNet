import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { schema } from '../db';
import { customerWhere, stationInCustomer, objectInCustomer, objectIdsWhere, andAll } from './scope';

const render = (s: ReturnType<typeof customerWhere>) => (s ? new PgDialect().sqlToQuery(s) : undefined);

describe('scope helpers', () => {
  it('customerWhere: null customer → no condition, number → equality', () => {
    expect(customerWhere({ customerId: null }, schema.stations.customerId)).toBeUndefined();
    const q = render(customerWhere({ customerId: 7 }, schema.stations.customerId))!;
    expect(q.sql).toMatch(/"stations"\."customer_id" = \$1/);
    expect(q.params).toEqual([7]);
  });
  it('stationInCustomer builds an EXISTS on stations', () => {
    const q = render(stationInCustomer({ customerId: 7 }, schema.waveformData.stationId))!;
    expect(q.sql).toMatch(/exists/i);
    expect(q.sql).toMatch(/"stations"\."customer_id" = \$1/);
    expect(q.params).toEqual([7]);
    expect(stationInCustomer({ customerId: null }, schema.waveformData.stationId)).toBeUndefined();
  });
  it('objectInCustomer builds an EXISTS on infrastructure_objects', () => {
    const q = render(objectInCustomer({ customerId: 3 }, schema.soilProfiles.objectId))!;
    expect(q.sql).toMatch(/"infrastructure_objects"\."customer_id" = \$1/);
  });
  it('objectIdsWhere: no objectIds → undefined; empty list → impossible id; list → IN', () => {
    expect(objectIdsWhere({ customerId: 1 }, schema.sensors.objectId)).toBeUndefined();
    expect(render(objectIdsWhere({ customerId: 1, objectIds: [] }, schema.sensors.objectId))!.params).toEqual([-1]);
    expect(render(objectIdsWhere({ customerId: 1, objectIds: [4, 5] }, schema.sensors.objectId))!.params).toEqual([4, 5]);
  });
  it('andAll drops undefined and returns undefined when nothing is left', () => {
    expect(andAll(undefined, undefined)).toBeUndefined();
    expect(render(andAll(undefined, customerWhere({ customerId: 2 }, schema.stations.customerId)))!.params).toEqual([2]);
  });
});
