import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import EmptyVehiclesState from "./components/EmptyVehiclesState";
import VehicleForm from "./components/VehicleForm";
import {
  deleteVehicle,
  getVehicles,
  markVehicleViewed,
  upsertVehicle,
} from "./logic/vehicleStorage";
import { VEHICLE_COLORS } from "./constants/vehicleColors";
import { vehicleStyles as styles } from "./styles/vehicleStyles";
import { vehicleScreenModernStyles as modernStyles } from "./styles/vehicleScreenModernStyles";
import NewLookBottomNav from "../../src/navigation/NewLookBottomNav";
import AppScreenHeader from "../../src/layout/AppScreenHeader";
import { AppColors } from "../../src/theme/colors";

function clean(value) {
  return String(value ?? "").trim();
}

function vehicleMakeModel(vehicle) {
  return [vehicle?.manufacturer, vehicle?.model].filter(Boolean).join(" ") || "Manufacturer / Model not set";
}

function vehicleChassis(vehicle) {
  return clean(vehicle?.chassisStyle || vehicle?.vehicleStyle) || "Vehicle details";
}

function vehicleTx(vehicle) {
  return clean(vehicle?.transponder || vehicle?.transponderNumber || vehicle?.transponderId) || "—";
}

export default function VehicleScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams();
  const isLandscape = width > height;
  const isTabletLandscape = width >= 700 && isLandscape;

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const pendingViewSetupsRef = useRef(null);
  const androidNavigationTimerRef = useRef(null);
  const handledRouteActionRef = useRef("");

  const loadVehicles = useCallback(async () => {
    const savedVehicles = await getVehicles();
    setVehicles(savedVehicles);
  }, []);

  useEffect(() => () => {
    if (androidNavigationTimerRef.current) {
      clearTimeout(androidNavigationTimerRef.current);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getVehicles()
        .then((savedVehicles) => {
          if (active) setVehicles(savedVehicles);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  }

  function openAddForm() {
    pendingViewSetupsRef.current = null;
    setEditingVehicle(null);
    setFormVisible(true);
  }

  useEffect(() => {
    const editId = clean(params?.editVehicleId);
    const wantsAdd = String(params?.addVehicle || "") === "1";
    const actionKey = editId ? `edit:${editId}` : wantsAdd ? "add" : "";
    if (!actionKey || handledRouteActionRef.current === actionKey || loading) return;

    if (editId) {
      const vehicle = vehicles.find((item) => clean(item?.id || item?.vehicleId) === editId);
      if (!vehicle) return;
      handledRouteActionRef.current = actionKey;
      openEditForm(vehicle);
      return;
    }

    handledRouteActionRef.current = actionKey;
    openAddForm();
  }, [loading, params?.addVehicle, params?.editVehicleId, vehicles]);

  const handleBack = useCallback(() => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/garage");
  }, []);

  function openEditForm(vehicle) {
    pendingViewSetupsRef.current = null;
    markVehicleViewed(vehicle?.id).catch(() => {});
    setEditingVehicle(vehicle);
    setFormVisible(true);
  }

  async function handleSave(vehicleDraft) {
    await upsertVehicle(vehicleDraft);
    setFormVisible(false);
    setEditingVehicle(null);
    await loadVehicles();
  }

  async function handleDelete(vehicleId) {
    const nextVehicles = await deleteVehicle(vehicleId);
    setVehicles(nextVehicles);
    setFormVisible(false);
    setEditingVehicle(null);
  }

  function handleViewSetups(vehicle) {
    pendingViewSetupsRef.current = vehicle;
    markVehicleViewed(vehicle?.id).catch(() => {});
    setFormVisible(false);
    setEditingVehicle(null);

    // iOS calls Modal.onDismiss after its native transition is complete.
    // Keep a short Android fallback because onDismiss is iOS-only in RN docs.
    if (Platform.OS !== "ios") {
      if (androidNavigationTimerRef.current) {
        clearTimeout(androidNavigationTimerRef.current);
      }
      androidNavigationTimerRef.current = setTimeout(handleVehicleFormDismiss, 260);
    }
  }

  function handleVehicleFormDismiss() {
    const vehicle = pendingViewSetupsRef.current;
    if (!vehicle) return;

    pendingViewSetupsRef.current = null;
    if (androidNavigationTimerRef.current) {
      clearTimeout(androidNavigationTimerRef.current);
      androidNavigationTimerRef.current = null;
    }

    router.push({
      pathname: "/setups",
      params: {
        vehicleId: vehicle.id,
        vehicleName: vehicle.name || "",
        mode: "vehicle",
      },
    });
  }

  return (
    <View style={styles.safeArea}>
      <View
        style={[
          styles.screen,
          modernStyles.screenWithSafeArea,
          {
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        <View style={[modernStyles.sharedHeaderInset, isTabletLandscape && modernStyles.sharedHeaderInsetTabletLandscape]}>
          <AppScreenHeader
            title="Vehicles"
            kicker="IMRC GARAGE"
            onBack={handleBack}
            rightLabel="+ ADD"
            onRightPress={openAddForm}
          />
        </View>

        <View style={[listStyles.introRow, isTabletLandscape && listStyles.introRowTabletLandscape]}>
          <Text style={modernStyles.subHeaderText} numberOfLines={2}>
            Saved cars are used for Setups and Race Day.
          </Text>
          <Text style={listStyles.savedCount}>{vehicles.length} SAVED</Text>
        </View>

        <ScrollView
          style={modernStyles.bodyScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={VEHICLE_COLORS.accent}
            />
          }
          contentContainerStyle={[
            modernStyles.bodyContent,
            isLandscape && modernStyles.bodyContentLandscape,
            isTabletLandscape && modernStyles.bodyContentTabletLandscape,
            {
              paddingBottom: Math.max(insets.bottom + 82, 92),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={modernStyles.loadingBlock}>
              <ActivityIndicator color={VEHICLE_COLORS.accent} size="large" />
            </View>
          ) : vehicles.length === 0 ? (
            <EmptyVehiclesState onAdd={openAddForm} />
          ) : (
            <View style={listStyles.vehicleList}>
              {vehicles.map((vehicle, index) => (
                <Pressable
                  key={clean(vehicle?.id || vehicle?.vehicleId) || String(index)}
                  style={({ pressed }) => [listStyles.vehicleRow, pressed && listStyles.pressed]}
                  onPress={() => openEditForm(vehicle)}
                >
                  <Text style={listStyles.vehicleNumber}>{String(index + 1).padStart(2, "0")}</Text>
                  <View style={listStyles.vehicleIdentity}>
                    <Text style={listStyles.vehicleName} numberOfLines={1}>{vehicle?.name || "Unnamed vehicle"}</Text>
                    <Text style={listStyles.vehicleMeta} numberOfLines={1}>{vehicleMakeModel(vehicle)}</Text>
                    <Text style={listStyles.vehicleChassis} numberOfLines={1}>{vehicleChassis(vehicle)}</Text>
                  </View>
                  <View style={listStyles.txBox}>
                    <Text style={listStyles.txLabel}>TX</Text>
                    <Text style={listStyles.txValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{vehicleTx(vehicle)}</Text>
                  </View>
                  <Text style={listStyles.chevron}>›</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <NewLookBottomNav active="garage" router={router} />

        <VehicleForm
          visible={formVisible}
          vehicle={editingVehicle}
          onCancel={() => {
            pendingViewSetupsRef.current = null;
            setFormVisible(false);
            setEditingVehicle(null);
          }}
          onSave={handleSave}
          onDelete={handleDelete}
          onViewSetups={handleViewSetups}
          onDismiss={handleVehicleFormDismiss}
        />
      </View>
    </View>
  );
}

const listStyles = StyleSheet.create({
  introRow: {
    minHeight: 48,
    marginHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  introRowTabletLandscape: { marginHorizontal: 22 },
  savedCount: { color: AppColors.mutedText, fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  vehicleList: { borderTopWidth: 1, borderTopColor: AppColors.borderStrong },
  vehicleRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  vehicleNumber: { width: 24, color: AppColors.subtleText, fontSize: 9, fontWeight: "800" },
  vehicleIdentity: { flex: 1, minWidth: 0 },
  vehicleName: { color: AppColors.textStrong, fontSize: 14, fontWeight: "900" },
  vehicleMeta: { marginTop: 2, color: AppColors.mutedText, fontSize: 9 },
  vehicleChassis: { marginTop: 2, color: AppColors.subtleText, fontSize: 8, fontWeight: "700" },
  txBox: {
    width: 62,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: "rgba(47,140,255,0.70)",
    backgroundColor: "rgba(47,140,255,0.12)",
  },
  txLabel: { color: AppColors.primary, fontSize: 6, lineHeight: 7, fontWeight: "900", letterSpacing: 0.5 },
  txValue: { width: "100%", color: AppColors.textStrong, fontSize: 9, lineHeight: 11, fontWeight: "900", textAlign: "center" },
  chevron: { color: AppColors.primary, fontSize: 21 },
  pressed: { opacity: 0.72 },
});
