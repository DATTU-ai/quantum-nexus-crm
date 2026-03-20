/**
 * @template T
 * @param {string} url
 * @returns {Promise<T>}
 */
export async function apiGet(url) {
  const token =
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("dattu.crm.token") ||
    window.sessionStorage.getItem("token") ||
    window.sessionStorage.getItem("dattu.crm.token");

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return /** @type {T} */ (undefined);
  }

  return res.json();
}
