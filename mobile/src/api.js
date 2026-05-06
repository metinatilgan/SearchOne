import Constants from "expo-constants";
import { Platform } from "react-native";

const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl;
const apiTimeoutMs = Number(Constants.expoConfig?.extra?.apiTimeoutMs || 12_000);

export function getApiBaseUrl() {
  if (configuredBaseUrl && configuredBaseUrl !== "http://localhost:5173") {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5173";
  }

  return "http://localhost:5173";
}

export async function searchTarget({ query, targetType, location }) {
  return fetchJson(`${getApiBaseUrl()}/api/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      targetType,
      location
    })
  });
}

export async function getHealth() {
  return fetchJson(`${getApiBaseUrl()}/api/health`);
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), apiTimeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "İstek tamamlanamadı.");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("API yanıtı zaman aşımına uğradı.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function assertApiReachable() {
  const response = await fetch(`${getApiBaseUrl()}/api/health`);
  if (!response.ok) {
    throw new Error("API sağlık kontrolü başarısız oldu.");
  }
  return true;
}
