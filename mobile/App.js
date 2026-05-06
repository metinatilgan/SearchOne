import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from "react-native";

import { getHealth, searchTarget } from "./src/api";
import {
  clearRecentSearches,
  loadRecentSearches,
  saveRecentSearches,
  upsertRecentSearch
} from "./src/recentSearches";

const PRIVACY_POLICY_URL = Constants.expoConfig?.extra?.privacyPolicyUrl || "https://example.com/privacy";
const PRIVACY_CHOICES_URL = Constants.expoConfig?.extra?.privacyChoicesUrl || PRIVACY_POLICY_URL;
const TERMS_URL = Constants.expoConfig?.extra?.termsUrl || "https://example.com/terms";
const EULA_URL = Constants.expoConfig?.extra?.eulaUrl || "https://example.com/eula";
const SUBSCRIPTION_TERMS_URL = Constants.expoConfig?.extra?.subscriptionTermsUrl || "https://example.com/subscription-terms";

const LEGAL_LINKS = [
  { label: "Gizlilik", icon: "document-text-outline", url: PRIVACY_POLICY_URL },
  { label: "Kullanım Şartları", icon: "reader-outline", url: TERMS_URL },
  { label: "EULA", icon: "shield-outline", url: EULA_URL },
  { label: "Abonelik Şartları", icon: "card-outline", url: SUBSCRIPTION_TERMS_URL },
  { label: "Gizlilik Tercihleri", icon: "options-outline", url: PRIVACY_CHOICES_URL }
];

const TARGET_TYPES = [
  { value: "business", label: "İşyeri" },
  { value: "person", label: "Şahıs" }
];

export default function App() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [targetType, setTargetType] = useState("business");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [providerStatus, setProviderStatus] = useState("API kontrol ediliyor");
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    getHealth()
      .then((health) => {
        setProviderStatus(health.providerConfigured ? "Canlı arama hazır" : "Demo modu");
      })
      .catch(() => setProviderStatus("API bağlantısı yok"));

    loadRecentSearches().then(setRecentSearches);
  }, []);

  const privacyCopy = useMemo(() => {
    if (result?.privacyNotice) {
      return result.privacyNotice;
    }

    return "Şahıs aramalarında özel telefon, kişisel e-posta ve ev adresi çıkarılmaz. Kaynaklı kamuya açık profil ve işletme bilgileri gösterilir.";
  }, [result]);

  async function handleSearch(nextSearch) {
    const searchInput = nextSearch || { query, targetType, location };
    const trimmedQuery = searchInput.query.trim();
    if (trimmedQuery.length < 2) {
      Alert.alert("Arama gerekli", "En az iki karakter girin.");
      return;
    }

    const nextTargetType = searchInput.targetType || targetType;
    const nextLocation = (searchInput.location || "").trim();

    setQuery(trimmedQuery);
    setTargetType(nextTargetType);
    setLocation(nextLocation);
    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const nextResult = await searchTarget({
        query: trimmedQuery,
        targetType: nextTargetType,
        location: nextLocation
      });
      setResult(nextResult);
      const nextRecentSearches = upsertRecentSearch(recentSearches, {
        query: trimmedQuery,
        targetType: nextTargetType,
        location: nextLocation
      });
      setRecentSearches(nextRecentSearches);
      saveRecentSearches(nextRecentSearches);
    } catch (error) {
      Alert.alert("Arama tamamlanamadı", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClearRecentSearches() {
    setRecentSearches([]);
    await clearRecentSearches();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.screen}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>PUBLIC WEB INTELLIGENCE</Text>
              <Text style={styles.title}>SearchOne</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{providerStatus}</Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Text style={styles.label}>Aranacak ad, marka veya işletme</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Örn. Acme Yazılım"
              placeholderTextColor="#8a908b"
              autoCapitalize="words"
              returnKeyType="search"
              onSubmitEditing={() => handleSearch()}
              style={styles.input}
            />

            <View style={styles.targetRow}>
              {TARGET_TYPES.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setTargetType(item.value)}
                  style={[
                    styles.targetButton,
                    targetType === item.value && styles.targetButtonActive
                  ]}
                >
                  <Text
                    style={[
                      styles.targetButtonText,
                      targetType === item.value && styles.targetButtonTextActive
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Konum</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="İstanbul, Ankara..."
              placeholderTextColor="#8a908b"
              autoCapitalize="words"
              style={styles.inputSmall}
            />

            <Pressable
              onPress={() => handleSearch()}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.searchButton,
                pressed && styles.searchButtonPressed,
                isLoading && styles.searchButtonDisabled
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fffdf7" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#fffdf7" />
                  <Text style={styles.searchButtonText}>Ara</Text>
                </>
              )}
            </Pressable>
          </View>

          {recentSearches.length > 0 && (
            <View style={styles.recentBlock}>
              <View style={styles.recentHeader}>
                <Text style={styles.label}>Son aramalar</Text>
                <Pressable onPress={() => handleClearRecentSearches()} hitSlop={10}>
                  <Text style={styles.clearRecentText}>Temizle</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
                {recentSearches.map((item) => (
                  <Pressable
                    key={`${item.targetType}-${item.query}-${item.location}`}
                    onPress={() => handleSearch(item)}
                    style={({ pressed }) => [styles.recentChip, pressed && styles.rowPressed]}
                  >
                    <Ionicons name="time-outline" size={14} color="#0a5b4c" />
                    <Text style={styles.recentChipText} numberOfLines={1}>{item.query}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.notice}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#0a5b4c" />
            <Text style={styles.noticeText}>{privacyCopy}</Text>
          </View>

          {result ? <Results result={result} /> : <EmptyState />}

          <View style={styles.footerLinks}>
            {LEGAL_LINKS.map((link) => (
              <Pressable key={link.label} style={styles.footerLink} onPress={() => openUrl(link.url)}>
                <Ionicons name={link.icon} size={16} color="#0a5b4c" />
                <Text style={styles.footerLinkText}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="scan-outline" size={28} color="#fffdf7" />
      </View>
      <Text style={styles.emptyTitle}>Bir arama başlatın.</Text>
      <Text style={styles.emptyText}>
        Sonuçlar sosyal profil adayları, resmi kaynaklar, işletme iletişim kayıtları ve güven skoru olarak ayrıştırılır.
      </Text>
    </View>
  );
}

function Results({ result }) {
  return (
    <View style={styles.results}>
      <View style={styles.summary}>
        <View style={styles.metricRow}>
          <Metric label={result.mode === "live" ? "Canlı" : "Demo"} value={result.provider} />
          <Metric label="Güven" value={`${result.confidence}/100`} />
          <Metric label="Kaynak" value={String(result.sources.length)} />
        </View>
        <Text style={styles.summaryText}>{result.summary}</Text>
        <Pressable style={styles.shareButton} onPress={() => shareResult(result)}>
          <Ionicons name="share-outline" size={17} color="#0a5b4c" />
          <Text style={styles.shareButtonText}>Sonucu paylaş</Text>
        </Pressable>
      </View>

      <Section title="Sosyal ve profesyonel profiller">
        {result.socialProfiles.length ? (
          result.socialProfiles.map((item) => (
            <LinkRow
              key={`${item.platform}-${item.url}`}
              icon="people-outline"
              title={item.platform}
              subtitle={item.title}
              url={item.url}
            />
          ))
        ) : (
          <MutedText>Sosyal profil adayı bulunamadı.</MutedText>
        )}
      </Section>

      <Section title={result.targetType === "person" ? "Kaynak politikası" : "İletişim"}>
        {result.targetType === "person" ? (
          <InfoRow icon="lock-closed-outline" title="Gizlilik filtresi aktif" subtitle={result.privacyNotice} />
        ) : result.contacts.length ? (
          result.contacts.map((item) => (
            <LinkRow
              key={`${item.type}-${item.value}`}
              icon={contactIcon(item.type)}
              title={contactLabel(item.type)}
              subtitle={`${item.value}\n${item.sourceHost}`}
              url={item.sourceUrl}
            />
          ))
        ) : (
          <MutedText>İşletme/kurum iletişimi için kaynaklı kayıt bulunamadı.</MutedText>
        )}
      </Section>

      <Section title="Resmi kaynak adayları">
        {result.officialSources.length ? (
          result.officialSources.map((item) => (
            <LinkRow
              key={item.url}
              icon="ribbon-outline"
              title={item.title}
              subtitle={`${item.host} · ${trustLabel(item.sourceTrust)} · ${item.confidence}`}
              url={item.url}
            />
          ))
        ) : (
          <MutedText>Resmi kaynak adayı bulunamadı.</MutedText>
        )}
      </Section>

      <Section title="Arama kaynakları">
        {result.sources.map((item) => (
          <LinkRow
            key={item.url}
            icon="link-outline"
            title={item.title || item.host}
            subtitle={`${item.host} · ${item.sourceLabel} · ${trustLabel(item.sourceTrust)}\n${item.snippet}`}
            url={item.url}
          />
        ))}
      </Section>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function LinkRow({ icon, title, subtitle, url }) {
  return (
    <Pressable
      onPress={() => openUrl(url)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color="#0e7c66" />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="open-outline" size={18} color="#69736d" />
    </Pressable>
  );
}

function InfoRow({ icon, title, subtitle }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color="#0e7c66" />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function MutedText({ children }) {
  return <Text style={styles.muted}>{children}</Text>;
}

function contactLabel(type) {
  const labels = {
    email: "E-posta",
    phone: "Telefon",
    address: "Adres"
  };
  return labels[type] || type;
}

function contactIcon(type) {
  const icons = {
    email: "mail-outline",
    phone: "call-outline",
    address: "location-outline"
  };
  return icons[type] || "information-circle-outline";
}

function trustLabel(trust) {
  const labels = {
    high: "yüksek güven",
    medium: "orta güven",
    low: "kontrol gerekli"
  };
  return labels[trust] || "kontrol gerekli";
}

async function shareResult(result) {
  const topSources = result.sources
    .slice(0, 3)
    .map((source, index) => `${index + 1}. ${source.title || source.host} - ${source.url}`)
    .join("\n");

  await Share.share({
    message: `${result.query}\n${result.summary}\n\nKaynaklar:\n${topSources}`
  });
}

async function openUrl(url) {
  if (!url) {
    return;
  }

  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f6f3ea"
  },
  screen: {
    paddingHorizontal: 18,
    paddingTop: Platform.select({ ios: 8, default: 22 }),
    paddingBottom: 36
  },
  header: {
    gap: 14,
    marginBottom: 18
  },
  eyebrow: {
    color: "#0a5b4c",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0
  },
  title: {
    color: "#17211c",
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 52
  },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#d8d1c3",
    backgroundColor: "#fffdf7",
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0e7c66"
  },
  statusText: {
    color: "#344139",
    fontSize: 12,
    fontWeight: "700"
  },
  searchBox: {
    borderWidth: 1,
    borderColor: "#d8d1c3",
    backgroundColor: "#fffdf7",
    padding: 16,
    gap: 10
  },
  label: {
    color: "#69736d",
    fontSize: 12,
    fontWeight: "700"
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#d8d1c3",
    backgroundColor: "#fffef9",
    paddingHorizontal: 14,
    color: "#17211c",
    fontSize: 18
  },
  inputSmall: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#d8d1c3",
    backgroundColor: "#fffef9",
    paddingHorizontal: 14,
    color: "#17211c",
    fontSize: 16
  },
  targetRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#d8d1c3",
    marginVertical: 4
  },
  targetButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center"
  },
  targetButtonActive: {
    backgroundColor: "#0e7c66"
  },
  targetButtonText: {
    color: "#69736d",
    fontSize: 13,
    fontWeight: "800"
  },
  targetButtonTextActive: {
    color: "#fffdf7"
  },
  searchButton: {
    minHeight: 52,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#17211c"
  },
  searchButtonPressed: {
    backgroundColor: "#0a5b4c"
  },
  searchButtonDisabled: {
    opacity: 0.7
  },
  searchButtonText: {
    color: "#fffdf7",
    fontSize: 16,
    fontWeight: "800"
  },
  notice: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#c8742b",
    backgroundColor: "#fff7e9",
    padding: 12
  },
  recentBlock: {
    gap: 8,
    marginTop: 12
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  recentList: {
    gap: 8,
    paddingRight: 18
  },
  recentChip: {
    maxWidth: 190,
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#d8d1c3",
    backgroundColor: "#fffdf7",
    paddingHorizontal: 10
  },
  recentChipText: {
    color: "#17211c",
    fontSize: 13,
    fontWeight: "800"
  },
  clearRecentText: {
    color: "#0a5b4c",
    fontSize: 12,
    fontWeight: "800"
  },
  noticeText: {
    flex: 1,
    color: "#5e4b35",
    fontSize: 14,
    lineHeight: 20
  },
  emptyState: {
    marginTop: 18,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d8d1c3",
    padding: 24
  },
  emptyIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    backgroundColor: "#17211c"
  },
  emptyTitle: {
    color: "#17211c",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center"
  },
  emptyText: {
    color: "#69736d",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },
  results: {
    gap: 18,
    marginTop: 18
  },
  summary: {
    gap: 12
  },
  metricRow: {
    flexDirection: "row",
    gap: 8
  },
  metric: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d8d1c3",
    backgroundColor: "#fffdf7",
    padding: 10
  },
  metricLabel: {
    color: "#69736d",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4
  },
  metricValue: {
    color: "#17211c",
    fontSize: 14,
    fontWeight: "800"
  },
  summaryText: {
    color: "#344139",
    fontSize: 17,
    lineHeight: 25
  },
  shareButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#bdd4cc",
    backgroundColor: "#e7f1ed",
    paddingHorizontal: 11
  },
  shareButtonText: {
    color: "#0a5b4c",
    fontSize: 13,
    fontWeight: "800"
  },
  section: {
    gap: 10,
    borderTopWidth: 2,
    borderTopColor: "#17211c",
    paddingTop: 12
  },
  sectionTitle: {
    color: "#17211c",
    fontSize: 21,
    fontWeight: "800"
  },
  sectionBody: {
    gap: 10
  },
  row: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#d8d1c3",
    backgroundColor: "#fffdf7",
    padding: 12
  },
  rowPressed: {
    backgroundColor: "#f2eee4"
  },
  rowIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e7f1ed"
  },
  rowCopy: {
    flex: 1,
    gap: 4
  },
  rowTitle: {
    color: "#17211c",
    fontSize: 15,
    fontWeight: "800"
  },
  rowSubtitle: {
    color: "#69736d",
    fontSize: 13,
    lineHeight: 19
  },
  muted: {
    color: "#69736d",
    fontSize: 14,
    lineHeight: 21
  },
  footerLinks: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8
  },
  footerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#d8d1c3",
    backgroundColor: "#fffdf7"
  },
  footerLinkText: {
    color: "#0a5b4c",
    fontSize: 13,
    fontWeight: "800"
  }
});
