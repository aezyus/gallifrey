export type StructureType = "bridge" | "dam" | "tunnel";

export type SensorType =
  | "accelerometer"
  | "strain_gauge"
  | "temperature"
  | "displacement"
  | "pressure";

export type Sensor = {
  id: string;
  name: string;
  type: SensorType;
  x: number;
  y: number;
  z: number;
};

export type Structure = {
  id: string;
  name: string;
  type: StructureType;
  location: string;
  notes?: string;
  createdAt: string;
  sensors: Sensor[];
};

const STORAGE_KEY = "gallifrey_structures_v1";

export function loadStructures(): Structure[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Structure[];
    return parsed;
  } catch {
    return [];
  }
}

export function saveStructures(structures: Structure[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(structures));
  } catch {
    // ignore
  }
}

export function createStructureId() {
  return `struct_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function createSensorId() {
  return `sensor_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

