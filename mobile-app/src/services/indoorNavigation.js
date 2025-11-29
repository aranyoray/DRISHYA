import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BEACON_STORAGE_KEY = '@indoor_beacons';

class IndoorNavigationService {
  constructor() {
    this.beacons = [];
    this.currentLocation = null;
    this.currentBuilding = null;
    this.navigationPath = [];
  }

  async initialize() {
    try {
      await this.loadBeacons();
      await this.startLocationTracking();

      console.log('[IndoorNav] Service initialized');
      return true;
    } catch (error) {
      console.error('[IndoorNav] Init error:', error.message);
      return false;
    }
  }

  async loadBeacons() {
    try {
      const data = await AsyncStorage.getItem(BEACON_STORAGE_KEY);
      if (data) {
        this.beacons = JSON.parse(data);
      }
    } catch (error) {
      console.error('[IndoorNav] Load beacons error:', error.message);
    }
  }

  async saveBeacons() {
    try {
      await AsyncStorage.setItem(BEACON_STORAGE_KEY, JSON.stringify(this.beacons));
    } catch (error) {
      console.error('[IndoorNav] Save beacons error:', error.message);
    }
  }

  async startLocationTracking() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now()
      };

      return this.currentLocation;

    } catch (error) {
      console.error('[IndoorNav] Location tracking error:', error.message);
      return null;
    }
  }

  async registerBeacon(beacon) {
    try {
      const newBeacon = {
        id: `beacon_${Date.now()}`,
        uuid: beacon.uuid,
        major: beacon.major,
        minor: beacon.minor,
        location: beacon.location,
        building: beacon.building,
        floor: beacon.floor,
        roomName: beacon.roomName,
        timestamp: Date.now()
      };

      this.beacons.push(newBeacon);
      await this.saveBeacons();

      return {
        success: true,
        beacon: newBeacon
      };

    } catch (error) {
      console.error('[IndoorNav] Register beacon error:', error.message);
      throw new Error('Failed to register beacon');
    }
  }

  async detectNearbyBeacons() {
    try {
      const nearby = this.beacons.filter(beacon => {
        return this.calculateDistance(beacon) < 50;
      });

      if (nearby.length > 0) {
        this.currentBuilding = nearby[0].building;
      }

      return nearby;

    } catch (error) {
      console.error('[IndoorNav] Detect beacons error:', error.message);
      return [];
    }
  }

  calculateDistance(beacon) {
    if (!this.currentLocation || !beacon.location) {
      return Infinity;
    }

    const R = 6371e3;
    const lat1 = this.currentLocation.latitude * Math.PI / 180;
    const lat2 = beacon.location.latitude * Math.PI / 180;
    const deltaLat = (beacon.location.latitude - this.currentLocation.latitude) * Math.PI / 180;
    const deltaLon = (beacon.location.longitude - this.currentLocation.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async navigateToRoom(roomName) {
    try {
      const targetBeacon = this.beacons.find(b =>
        b.roomName.toLowerCase() === roomName.toLowerCase()
      );

      if (!targetBeacon) {
        throw new Error('Room not found');
      }

      this.navigationPath = this.calculatePath(targetBeacon);

      return {
        success: true,
        destination: targetBeacon,
        path: this.navigationPath,
        distance: this.calculateDistance(targetBeacon)
      };

    } catch (error) {
      console.error('[IndoorNav] Navigate error:', error.message);
      throw new Error('Navigation failed');
    }
  }

  calculatePath(destination) {
    const path = [];

    if (this.currentBuilding === destination.building) {
      path.push({
        instruction: `Head to ${destination.roomName}`,
        floor: destination.floor,
        distance: this.calculateDistance(destination)
      });
    } else {
      path.push({
        instruction: 'Exit current building',
        type: 'exit'
      });
      path.push({
        instruction: `Enter ${destination.building}`,
        type: 'enter'
      });
      path.push({
        instruction: `Head to floor ${destination.floor}`,
        type: 'floor_change'
      });
      path.push({
        instruction: `Navigate to ${destination.roomName}`,
        type: 'destination'
      });
    }

    return path;
  }

  getNavigationInstructions() {
    if (this.navigationPath.length === 0) {
      return 'No active navigation';
    }

    return this.navigationPath.map((step, index) =>
      `Step ${index + 1}: ${step.instruction}`
    ).join('. ');
  }

  async getCurrentRoom() {
    const nearby = await this.detectNearbyBeacons();

    if (nearby.length > 0) {
      const closest = nearby.reduce((prev, curr) =>
        this.calculateDistance(curr) < this.calculateDistance(prev) ? curr : prev
      );

      return {
        building: closest.building,
        floor: closest.floor,
        room: closest.roomName
      };
    }

    return null;
  }

  clearNavigation() {
    this.navigationPath = [];
  }

  getAllBeacons() {
    return this.beacons;
  }

  async removeBeacon(beaconId) {
    try {
      this.beacons = this.beacons.filter(b => b.id !== beaconId);
      await this.saveBeacons();

      return { success: true };
    } catch (error) {
      console.error('[IndoorNav] Remove beacon error:', error.message);
      return { success: false };
    }
  }
}

export default new IndoorNavigationService();
