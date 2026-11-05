import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import StableSafeAreaView from '../../src/layout/StableSafeAreaView';
import SelectorCard from '../../features/setups/components/SelectorCard';
import { getEntityId, getVehicleDisplayName } from '../../features/setups/lib/setupModel';
import { getVehicles } from '../../features/setups/lib/setupStorage';
import { setupColors, setupStyles } from '../../features/setups/styles/setupStyles';

export default function SetupSelectVehicleScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getVehicles().then((items) => {
        if (mounted) {
          setVehicles(items);
          setLoading(false);
        }
      });
      return () => {
        mounted = false;
      };
    }, [])
  );

  const savedLabel = loading
    ? 'Loading vehicles…'
    : `${vehicles.length} saved vehicle${vehicles.length === 1 ? '' : 's'}`;

  return (
    <StableSafeAreaView edges={['top', 'bottom']} style={setupStyles.safe}>
      <View style={setupStyles.pageHeader}>
        <View style={setupStyles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              setupStyles.button,
              setupStyles.buttonSecondary,
              setupStyles.topBackButton,
              pressed && setupStyles.cardPressed,
            ]}
          >
            <Text style={setupStyles.buttonSecondaryText}>‹ Back</Text>
          </Pressable>

          <View style={setupStyles.headerTextWrap}>
            <Text style={setupStyles.eyebrow}>SETUPS • STEP 1 OF 2</Text>
            <Text style={setupStyles.title}>Pick Vehicle</Text>
          </View>

          <View style={setupStyles.headerSpacer} />
        </View>

        <Text style={setupStyles.subtitle}>Choose the vehicle this setup belongs to.</Text>

        <View style={setupStyles.countBadge}>
          <Text style={setupStyles.countBadgeText}>{savedLabel}</Text>
        </View>
      </View>

      <ScrollView style={setupStyles.scroll} contentContainerStyle={setupStyles.scrollContent} keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={[setupStyles.card, setupStyles.loadingCard]}>
            <ActivityIndicator color={setupColors.purple} />
            <Text style={setupStyles.emptyText}>Loading vehicles…</Text>
          </View>
        ) : !vehicles.length ? (
          <View style={setupStyles.card}>
            <Text style={setupStyles.emptyText}>No vehicles found. Add a vehicle first, then come back to Setups.</Text>
          </View>
        ) : (
          vehicles.map((vehicle) => {
            const vehicleId = getEntityId(vehicle);
            const title = getVehicleDisplayName(vehicle);
            const subtitle = [vehicle.manufacturer, vehicle.model, vehicle.chassisStyle || vehicle.vehicleStyle]
              .filter(Boolean)
              .join(' • ');

            return (
              <SelectorCard
                key={vehicleId || title}
                title={title}
                subtitle={subtitle || 'Vehicle setup target'}
                meta={vehicle.transponder ? `TX\n${vehicle.transponder}` : 'Vehicle'}
                onPress={() => router.push(`/setups/select-track?vehicleId=${encodeURIComponent(vehicleId)}`)}
              />
            );
          })
        )}
      </ScrollView>
    </StableSafeAreaView>
  );
}
