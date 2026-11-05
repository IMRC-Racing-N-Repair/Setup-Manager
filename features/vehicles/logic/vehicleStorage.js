import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeVehicle, makeVehicleId } from "./vehicleDefaults";

export const VEHICLES_STORAGE_KEY = "@vehicles";

export async function getVehicles() {
  try {
    const raw = await AsyncStorage.getItem(VEHICLES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeVehicle)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  } catch (error) {
    console.warn("Failed to load vehicles:", error);
    return [];
  }
}

export async function saveVehicles(vehicles) {
  const cleanVehicles = Array.isArray(vehicles)
    ? vehicles.map(normalizeVehicle)
    : [];

  await AsyncStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(cleanVehicles));
  return cleanVehicles;
}

export async function upsertVehicle(vehicle) {
  const vehicles = await getVehicles();
  const now = new Date().toISOString();

  const cleanVehicle = normalizeVehicle({
    ...vehicle,
    id: vehicle?.id || makeVehicleId(),
    createdAt: vehicle?.createdAt || now,
    updatedAt: now,
  });

  const exists = vehicles.some((item) => item.id === cleanVehicle.id);
  const nextVehicles = exists
    ? vehicles.map((item) => (item.id === cleanVehicle.id ? cleanVehicle : item))
    : [cleanVehicle, ...vehicles];

  await saveVehicles(nextVehicles);
  return cleanVehicle;
}

export async function deleteVehicle(vehicleId) {
  const vehicles = await getVehicles();
  const nextVehicles = vehicles.filter((vehicle) => vehicle.id !== vehicleId);
  await saveVehicles(nextVehicles);
  return nextVehicles;
}
