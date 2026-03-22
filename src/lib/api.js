/**
 * @template T
 * @param {string} url
 * @returns {Promise<T>}
 */
export async function apiGet(url) {
  try {
    const token = window.localStorage.getItem("token");

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
  } catch (err) {
    console.error("API ERROR:", err);
    throw err;
  }
}
