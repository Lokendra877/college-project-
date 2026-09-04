const DEVICE_ID_KEY = 'qr-auditorium-device-id';

export function getDeviceId(): string {
  // Use sessionStorage so distinct tabs (even in the same browser) get unique IDs for local testing
  let id = sessionStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

