import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "searchone.recentSearches.v1";
const MAX_RECENT_SEARCHES = 6;

export async function loadRecentSearches() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => typeof item?.query === "string" && item.query.trim().length >= 2)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export async function saveRecentSearches(items) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    // Recent searches are a convenience feature; search should never fail because storage failed.
  }
}

export async function clearRecentSearches() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage cleanup errors.
  }
}

export function upsertRecentSearch(items, nextItem) {
  return [
    {
      query: nextItem.query,
      targetType: nextItem.targetType,
      location: nextItem.location || ""
    },
    ...items.filter((item) =>
      item.query !== nextItem.query ||
      item.targetType !== nextItem.targetType ||
      item.location !== (nextItem.location || "")
    )
  ].slice(0, MAX_RECENT_SEARCHES);
}
