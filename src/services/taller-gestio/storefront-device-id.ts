export const STORE_DEVICE_ID_PREFIX = "eq-";

export function isStoreDeviceCatalogId(id: string) {
  return id.startsWith(STORE_DEVICE_ID_PREFIX);
}

function slugPart(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "x"
  );
}

export function catalogIdForDevice(device: {
  brand: string;
  model: string;
  color: string;
  storage: string;
  condition: string;
}) {
  return `${STORE_DEVICE_ID_PREFIX}${[
    slugPart(device.brand),
    slugPart(device.model),
    slugPart(device.color),
    slugPart(device.storage),
    slugPart(device.condition),
  ].join("-")}`;
}

export function catalogIdFromDevicePayload(payload: Record<string, unknown> | null | undefined) {
  if (!payload) return "";
  const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const condition = asText(payload.condition) === "Usado" ? "Usado" : "Nuevo";
  return catalogIdForDevice({
    brand: asText(payload.brand),
    model: asText(payload.model),
    color: asText(payload.color),
    storage: asText(payload.storage),
    condition,
  });
}
