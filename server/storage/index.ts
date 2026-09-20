import type { IStorage } from "./types";
import { usersStorage } from "./users";
import { stationsStorage } from "./stations";
import { eventsStorage } from "./events";
import { maintenanceStorage } from "./maintenance";
import { monitoringStorage } from "./monitoring";
import { infrastructureStorage } from "./infrastructure";
import { calculationsStorage } from "./calculations";
import { soilStorage } from "./soil";
import { sensorsStorage } from "./sensors";
import { normsStorage } from "./norms";
import { seismogramsStorage } from "./seismograms";
import { calibrationStorage } from "./calibration";
import { userObjectsStorage } from "./userObjects";
import { auditStorage } from "./audit";
import { customersStorage } from "./customers";

export { NOTE_HISTORY_LIMIT } from "./types";
export type { IStorage, ObjectScope, Scope } from "./types";

// One object per domain, merged into the single `storage` the rest of the
// server imports. The IStorage annotation keeps the surface identical.
export const storage: IStorage = {
  ...usersStorage,
  ...stationsStorage,
  ...eventsStorage,
  ...maintenanceStorage,
  ...monitoringStorage,
  ...infrastructureStorage,
  ...calculationsStorage,
  ...soilStorage,
  ...sensorsStorage,
  ...normsStorage,
  ...seismogramsStorage,
  ...calibrationStorage,
  ...userObjectsStorage,
  ...auditStorage,
  ...customersStorage,
};
