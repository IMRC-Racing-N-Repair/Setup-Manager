import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaLayout } from "../../../src/layout/safeAreaLayout";
import AppScreenHeader from "../../../src/layout/AppScreenHeader";

import ChassisStylePicker from "./ChassisStylePicker";
import { createEmptyVehicle } from "../logic/vehicleDefaults";
import { validateVehicle } from "../logic/vehicleValidation";
import { vehicleStyles as styles } from "../styles/vehicleStyles";
import { vehicleKeyboardStyles as keyboardStyles } from "../styles/vehicleKeyboardStyles";

export default function VehicleForm({
  visible,
  vehicle,
  onCancel,
  onSave,
  onDelete,
  onViewSetups,
  onDismiss,
}) {
  const { insets, height, usableWidth, usableHeight } = useSafeAreaLayout({ modalSize: "normal" });

  const scrollRef = useRef(null);
  const focusedFieldRef = useRef(null);
  const fieldPositionsRef = useRef({});
  const scrollTimerRef = useRef(null);
  const initialScrollTimerRef = useRef(null);
  const actionLockedRef = useRef(false);

  const [draft, setDraft] = useState(createEmptyVehicle());
  const [errors, setErrors] = useState({});
  const [pickerVisible, setPickerVisible] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const isEditing = Boolean(draft?.id);

  const isWideForm = usableWidth >= 760;
  const popupWidth = Math.min(Math.max(0, usableWidth - 24), isWideForm ? 920 : 560);
  const verticalSafeReserve = Math.max(insets.top + insets.bottom, 22);
  const popupHeight = Math.min(
    Math.floor(usableHeight * 0.9),
    Math.max(0, height - verticalSafeReserve - 28),
    isWideForm ? 720 : 650
  );

  const scrollFocusedFieldIntoView = useCallback((delay = 70) => {
    const fieldName = focusedFieldRef.current;
    if (!fieldName) return;

    const fieldY = fieldPositionsRef.current[fieldName];
    if (typeof fieldY !== "number") return;

    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, fieldY - 14),
        animated: true,
      });
      scrollTimerRef.current = null;
    }, delay);
  }, []);

  function getInputFocusProps(fieldName) {
    return {
      onFocus: () => {
        focusedFieldRef.current = fieldName;
        if (keyboardOpen) {
          scrollFocusedFieldIntoView(25);
        }
      },
    };
  }

  function storeFieldPosition(fieldName) {
    return (event) => {
      fieldPositionsRef.current[fieldName] = event.nativeEvent.layout.y;
    };
  }

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardOpen(true);
      setKeyboardHeight(event?.endCoordinates?.height || 0);
      scrollFocusedFieldIntoView(90);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardOpen(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (initialScrollTimerRef.current) clearTimeout(initialScrollTimerRef.current);
    };
  }, [scrollFocusedFieldIntoView]);

  useEffect(() => {
    if (!visible) {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (initialScrollTimerRef.current) clearTimeout(initialScrollTimerRef.current);
      scrollTimerRef.current = null;
      initialScrollTimerRef.current = null;
      return;
    }

    actionLockedRef.current = false;
    setDraft(vehicle || createEmptyVehicle());
    setErrors({});
    setPickerVisible(false);
    setKeyboardOpen(false);
    setKeyboardHeight(0);
    focusedFieldRef.current = null;
    fieldPositionsRef.current = {};

    initialScrollTimerRef.current = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      initialScrollTimerRef.current = null;
    }, 0);
  }, [visible, vehicle]);

  function updateField(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: "",
      }));
    }
  }

  async function handleSave() {
    if (actionLockedRef.current) return;
    const result = validateVehicle(draft);

    if (!result.isValid) {
      setErrors(result.errors);

      focusedFieldRef.current = result.errors.name
        ? "name"
        : result.errors.chassisStyle
          ? "chassisStyle"
          : null;

      scrollFocusedFieldIntoView(20);
      return;
    }

    actionLockedRef.current = true;
    Keyboard.dismiss();
    try {
      await onSave(draft);
    } catch (error) {
      actionLockedRef.current = false;
      throw error;
    }
  }

  function handleCancel() {
    if (actionLockedRef.current) return;
    actionLockedRef.current = true;
    Keyboard.dismiss();
    onCancel();
  }

  function handleDeletePress() {
    if (actionLockedRef.current || !draft?.id || !onDelete) return;

    actionLockedRef.current = true;
    Keyboard.dismiss();

    Alert.alert(
      "Delete Vehicle?",
      `Delete ${draft.name || "this vehicle"}? This will remove it from saved vehicles.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            actionLockedRef.current = false;
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(draft.id),
        },
      ]
    );
  }

  function handleViewSetupsPress() {
    if (actionLockedRef.current) return;
    actionLockedRef.current = true;
    Keyboard.dismiss();
    onViewSetups?.(draft);
  }

  function renderActionButtons() {
    return (
      <>
        {isEditing ? (
          <View style={keyboardStyles.actionTopRow}>
            <Pressable
              style={keyboardStyles.viewSetupsActionButton}
              onPress={handleViewSetupsPress}
            >
              <Text style={keyboardStyles.viewSetupsActionButtonText}>
                View Setups
              </Text>
            </Pressable>

            <Pressable
              style={keyboardStyles.deleteActionButton}
              onPress={handleDeletePress}
            >
              <Text style={keyboardStyles.deleteActionButtonText}>
                Delete Vehicle
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.formActionsCompact}>
          <Pressable style={styles.formButtonCompact} onPress={handleCancel}>
            <Text style={styles.formButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.formButtonCompact, styles.formButtonPrimary]}
            onPress={handleSave}
          >
            <Text style={styles.formButtonText}>Save Vehicle</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
        onDismiss={onDismiss}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View
          style={[
            styles.formOverlay,
            keyboardStyles.formOverlayStable,
            {
              paddingTop: Math.max(insets.top + 8, 16),
              paddingBottom: Math.max(insets.bottom + 8, 16),
              paddingLeft: Math.max(insets.left + 8, 12),
              paddingRight: Math.max(insets.right + 8, 12),
            },
          ]}
        >
          <View
            style={[
              styles.formPanel,
              keyboardStyles.formPanelStable,
              {
                width: popupWidth,
                height: popupHeight,
              },
            ]}
          >
            <View style={styles.formHandle} />

            <AppScreenHeader
              title={isEditing ? "Edit Vehicle" : "Add Vehicle"}
              kicker="IMRC GARAGE"
              onBack={handleCancel}
            />

            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.formContent,
                keyboardStyles.scrollContentStable,
                {
                  paddingBottom: keyboardOpen
                    ? keyboardHeight + insets.bottom + 132
                    : insets.bottom + 124,
                },
              ]}
            >
              <View style={styles.formIntro}>
                <Text style={styles.formIntroEyebrow}>VEHICLE PROFILE</Text>
                <Text style={styles.formIntroText}>
                  {isEditing
                    ? "Update the vehicle details used throughout Garage, Setups, and RaceDay."
                    : "Create a vehicle profile, then build track-specific setups from it."}
                </Text>
              </View>

              <View style={styles.formSectionHeader}>
                <Text style={styles.formSectionEyebrow}>IDENTITY</Text>
                <Text style={styles.formSectionTitle}>Vehicle details</Text>
              </View>

              <View
                style={styles.fieldCompact}
                onLayout={storeFieldPosition("name")}
              >
                <Text style={styles.labelCompact}>Vehicle Name *</Text>
                <TextInput
                  value={draft.name}
                  onChangeText={(value) => updateField("name", value)}
                  placeholder="Example: Yoshi Truck"
                  placeholderTextColor="#6F7A8C"
                  style={[styles.inputCompact, errors.name && styles.inputError]}
                  autoCorrect={false}
                  returnKeyType="next"
                  {...getInputFocusProps("name")}
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>

              <View style={styles.formRow}>
                <View
                  style={styles.formRowItem}
                  onLayout={storeFieldPosition("manufacturer")}
                >
                  <Text style={styles.labelCompact}>Manufacturer</Text>
                  <TextInput
                    value={draft.manufacturer}
                    onChangeText={(value) => updateField("manufacturer", value)}
                    placeholder="CRC"
                    placeholderTextColor="#6F7A8C"
                    style={styles.inputCompact}
                    autoCorrect={false}
                    returnKeyType="next"
                    {...getInputFocusProps("manufacturer")}
                  />
                </View>

                <View
                  style={styles.formRowItem}
                  onLayout={storeFieldPosition("model")}
                >
                  <Text style={styles.labelCompact}>Model</Text>
                  <TextInput
                    value={draft.model}
                    onChangeText={(value) => updateField("model", value)}
                    placeholder="CK25"
                    placeholderTextColor="#6F7A8C"
                    style={styles.inputCompact}
                    autoCorrect={false}
                    returnKeyType="next"
                    {...getInputFocusProps("model")}
                  />
                </View>
              </View>

              <View style={styles.formSectionHeader}>
                <Text style={styles.formSectionEyebrow}>RACE PROFILE</Text>
                <Text style={styles.formSectionTitle}>Chassis and scoring</Text>
              </View>

              <View style={isWideForm ? styles.formRow : undefined}>
                <View
                  style={isWideForm ? styles.formRowItem : styles.fieldCompact}
                  onLayout={storeFieldPosition("chassisStyle")}
                >
                  <Text style={styles.labelCompact}>Chassis Style *</Text>
                  <Pressable
                    style={[
                      styles.pickerButtonCompact,
                      draft.chassisStyle && styles.pickerButtonSelected,
                      errors.chassisStyle && styles.inputError,
                    ]}
                    onPress={() => {
                      if (actionLockedRef.current || pickerVisible) return;
                      Keyboard.dismiss();
                      focusedFieldRef.current = "chassisStyle";
                      setPickerVisible(true);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerButtonTextCompact,
                        !draft.chassisStyle && styles.pickerButtonPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {draft.chassisStyle || "Select chassis style"}
                    </Text>
                    <Text style={styles.pickerChevron}>⌄</Text>
                  </Pressable>

                  {errors.chassisStyle ? (
                    <Text style={styles.errorText}>{errors.chassisStyle}</Text>
                  ) : null}
                </View>

                <View
                  style={isWideForm ? styles.formRowItem : styles.fieldCompact}
                  onLayout={storeFieldPosition("transponder")}
                >
                  <Text style={styles.labelCompact}>Transponder Number</Text>
                  <TextInput
                    value={draft.transponder}
                    onChangeText={(value) => updateField("transponder", value)}
                    placeholder="Example: 3358118"
                    placeholderTextColor="#6F7A8C"
                    style={styles.inputCompact}
                    autoCorrect={false}
                    keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                    returnKeyType="next"
                    {...getInputFocusProps("transponder")}
                  />
                </View>
              </View>

              <View style={styles.formSectionHeader}>
                <Text style={styles.formSectionEyebrow}>NOTES</Text>
                <Text style={styles.formSectionTitle}>Anything worth remembering</Text>
              </View>

              <View
                style={styles.fieldCompact}
                onLayout={storeFieldPosition("notes")}
              >
                <Text style={styles.labelCompact}>Notes</Text>
                <TextInput
                  value={draft.notes}
                  onChangeText={(value) => updateField("notes", value)}
                  placeholder="Optional vehicle notes..."
                  placeholderTextColor="#6F7A8C"
                  style={[styles.inputCompact, styles.textAreaCompact]}
                  multiline
                  textAlignVertical="top"
                  {...getInputFocusProps("notes")}
                />
              </View>
            </ScrollView>

            {!keyboardOpen ? (
              <View
                style={[
                  keyboardStyles.fixedActionBar,
                  {
                    paddingBottom: Math.max(insets.bottom + 10, 14),
                  },
                ]}
              >
                {renderActionButtons()}
              </View>
            ) : null}
          </View>

          {keyboardOpen ? (
            <View
              style={[
                keyboardStyles.floatingActionBar,
                {
                  width: popupWidth,
                  bottom: Math.max(8, keyboardHeight + insets.bottom + 8),
                },
              ]}
            >
              {renderActionButtons()}
            </View>
          ) : null}

          <ChassisStylePicker
            visible={pickerVisible}
            selectedValue={draft.chassisStyle}
            onSelect={(value) => updateField("chassisStyle", value)}
            onClose={() => setPickerVisible(false)}
          />
        </View>
      </Modal>
    </>
  );
}
