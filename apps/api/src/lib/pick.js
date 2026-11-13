/** Devuelve solo las llaves permitidas; evita enviar embeds de PostgREST (contacts, notes, …) como columnas. */
export function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}
