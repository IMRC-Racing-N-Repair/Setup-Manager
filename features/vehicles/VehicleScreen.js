import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import EmptyVehiclesState from "./components/EmptyVehiclesState";
import VehicleCard from "./components/VehicleCard";
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

export default function VehicleScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const pendingViewSetupsRef = useRef(null);
  const androidNavigationTimerRef = useRef(null);

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

  const vehicleCountLabel =
    vehicles.length === 1 ? "1 saved vehicle" : `${vehicles.length} saved vehicles`;

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
        <View style={modernStyles.headerBar}>
          <Pressable style={modernStyles.headerSideButton} onPress={handleBack}>
            <Text style={modernStyles.headerSideButtonText}>‹ Back</Text>
          </Pressable>

          <View style={modernStyles.headerTitleBlock}>
            <Text style={modernStyles.headerKicker}>IMRC Garage</Text>
            <Text style={modernStyles.headerTitle}>Vehicles</Text>
          </View>

          <Pressable style={modernStyles.headerAddButton} onPress={openAddForm}>
            <Text style={modernStyles.headerAddButtonText}>+ Add</Text>
          </Pressable>
        </View>

        <View style={modernStyles.subHeaderRow}>
          <Text style={modernStyles.subHeaderText} numberOfLines={2}>
            Saved cars are used for Setups and Race Day.
          </Text>

          <View style={modernStyles.countPill}>
            <Text style={modernStyles.countPillText}>{vehicleCountLabel}</Text>
          </View>
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
            {
              paddingBottom: Math.max(insets.bottom + 18, 28),
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
            <View
              style={isLandscape ? styles.landscapeGrid : styles.portraitList}
            >
              {vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  isLandscape={isLandscape}
                  onEdit={openEditForm}
                />
              ))}
            </View>
          )}
        </ScrollView>

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
