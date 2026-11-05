import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaLayout } from "../../../src/layout/safeAreaLayout";

import { VEHICLE_CHASSIS_SECTIONS } from "../constants/chassisStyles";
import { vehicleStyles as styles } from "../styles/vehicleStyles";

export default function ChassisStylePicker({
  visible,
  selectedValue,
  onSelect,
  onClose,
}) {
  const [search, setSearch] = useState("");
  const [rendered, setRendered] = useState(Boolean(visible));
  const slideY = useRef(new Animated.Value(visible ? 0 : 48)).current;
  const backdropOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const selectingRef = useRef(false);
  const { modalBackdropStyle, modalCardStyle } = useSafeAreaLayout({ modalSize: "normal" });

  useEffect(() => {
    let frame = null;

    if (visible) {
      selectingRef.current = false;
      setSearch("");
      setRendered(true);
      slideY.setValue(48);
      backdropOpacity.setValue(0);

      frame = requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(slideY, {
            toValue: 0,
            duration: 240,
            useNativeDriver: true,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else if (rendered) {
      selectingRef.current = false;
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: 48,
          duration: 210,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      slideY.stopAnimation();
      backdropOpacity.stopAnimation();
    };
  }, [visible]);

  const filteredSections = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    if (!cleanSearch) {
      return VEHICLE_CHASSIS_SECTIONS;
    }

    return VEHICLE_CHASSIS_SECTIONS
      .map((section) => ({
        ...section,
        data: section.data.filter((item) =>
          item.toLowerCase().includes(cleanSearch)
        ),
      }))
      .filter((section) => section.data.length > 0);
  }, [search]);

  if (!rendered) return null;

  return (
    <Animated.View
      style={[
        styles.modalOverlay,
        styles.modalOverlayEmbedded,
        modalBackdropStyle,
        { opacity: backdropOpacity },
      ]}
    >
        <Animated.View
          style={[
            styles.pickerPanel,
            modalCardStyle,
            { transform: [{ translateY: slideY }] },
          ]}
        >
          <View style={styles.pickerHeader}>
            <View style={styles.pickerTitleRow}>
              <View>
                <Text style={styles.kicker}>Vehicle</Text>
                <Text style={styles.pickerTitle}>Chassis Style</Text>
              </View>

              <Pressable style={styles.pickerClose} onPress={onClose}>
                <Text style={styles.pickerCloseText}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search chassis styles..."
              placeholderTextColor="#6F7A8C"
              autoCorrect={false}
              style={styles.searchInput}
            />
          </View>

          <SectionList
            style={{ flexShrink: 1, minHeight: 0 }}
            sections={filteredSections}
            keyExtractor={(item) => item}
            stickySectionHeadersEnabled={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 28 }}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isSelected = item === selectedValue;

              return (
                <Pressable
                  style={[
                    styles.optionRow,
                    isSelected && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    if (selectingRef.current) return;
                    selectingRef.current = true;
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text style={styles.optionText}>{item}</Text>
                  {isSelected ? (
                    <Text style={styles.optionCheck}>✓</Text>
                  ) : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  No chassis styles found.
                </Text>
              </View>
            }
          />
        </Animated.View>
    </Animated.View>
  );
}
