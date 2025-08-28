import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../../App';
import InteractiveMetalCard from '../components/InteractiveMetalCard';
import { apiService } from '../services/api';
import { MetalPrice } from '../types/MetalPrice';
import { generateWeeklyData, WeeklyMetalData, PriceAlertManager, PriceAlert } from '../services/historicalData';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const alertManager = new PriceAlertManager();

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [weeklyDataList, setWeeklyDataList] = useState<WeeklyMetalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const fetchMetalPrices = async () => {
    try {
      const prices = await apiService.getAllMetalPrices();
      const enhancedData = prices.map(price => generateWeeklyData(price));
      setWeeklyDataList(enhancedData);
      
      // Check for price alerts
      const triggeredAlerts = alertManager.checkAlerts(prices);
      if (triggeredAlerts.length > 0) {
        triggeredAlerts.forEach(alert => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Price Alert! 🚨',
            `${alert.metal} has reached ₹${alert.targetPrice}/gram!`,
            [{ text: 'OK' }]
          );
        });
      }
      
      setAlerts(alertManager.getActiveAlerts());
    } catch (error) {
      console.error('Error fetching metal prices:', error);
      Alert.alert(
        'Error', 
        'Failed to fetch metal prices. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetalPrices();
    
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Load saved alerts
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const savedAlerts = await AsyncStorage.getItem('priceAlerts');
      if (savedAlerts) {
        const alertsData = JSON.parse(savedAlerts);
        // Re-populate alert manager
        alertsData.forEach((alert: PriceAlert) => {
          if (alert.isActive) {
            alertManager.addAlert({
              metal: alert.metal,
              targetPrice: alert.targetPrice,
              condition: alert.condition,
              isActive: alert.isActive,
            });
          }
        });
        setAlerts(alertManager.getActiveAlerts());
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const saveAlerts = async (newAlerts: PriceAlert[]) => {
    try {
      await AsyncStorage.setItem('priceAlerts', JSON.stringify(newAlerts));
    } catch (error) {
      console.error('Error saving alerts:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchMetalPrices();
  };

  const handleMetalPress = (metal: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Details', { metal });
  };

  const handleCardSwipeLeft = (metalData: WeeklyMetalData) => {
    // Create price alert
    const currentPrice = metalData.current.price_per_gram_inr;
    const alertPrice = currentPrice * 1.02; // 2% above current price
    
    Alert.prompt(
      'Set Price Alert',
      `Alert when ${metalData.metal} reaches:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set Alert',
          onPress: (value) => {
            const targetPrice = parseFloat(value || alertPrice.toString());
            if (targetPrice && targetPrice > 0) {
              const newAlert = alertManager.addAlert({
                metal: metalData.metal,
                targetPrice,
                condition: targetPrice > currentPrice ? 'above' : 'below',
                isActive: true,
              });
              
              const updatedAlerts = alertManager.getActiveAlerts();
              setAlerts(updatedAlerts);
              saveAlerts(updatedAlerts);
              
              Alert.alert(
                'Alert Created! ✅',
                `You'll be notified when ${metalData.metal} reaches ₹${targetPrice}/gram`
              );
            }
          }
        }
      ],
      'plain-text',
      alertPrice.toFixed(2)
    );
  };

  const handleCardSwipeRight = (metalData: WeeklyMetalData) => {
    // Add to watchlist (favorite)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Added to Watchlist! ⭐',
      `${metalData.metal} has been added to your watchlist`
    );
  };

  const renderMetalCard = ({ item, index }: { item: WeeklyMetalData; index: number }) => (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [
            { 
              translateY: slideAnim.interpolate({
                inputRange: [0, 30],
                outputRange: [0, 30 + (index * 10)],
              })
            }
          ]
        }
      ]}
    >
      <InteractiveMetalCard
        metalData={item}
        onPress={() => handleMetalPress(item.metal)}
        onSwipeLeft={() => handleCardSwipeLeft(item)}
        onSwipeRight={() => handleCardSwipeRight(item)}
      />
    </Animated.View>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={['#0c0c0c', '#1a1a1a', '#0c0c0c']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading precious metals...</Text>
        <Text style={styles.loadingSubtext}>Fetching live market data</Text>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0c0c0c', '#1a1a1a', '#0c0c0c']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFD700"
              colors={['#FFD700']}
              progressBackgroundColor="#1a1a1a"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA000']}
              style={styles.titleGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.title}>Precious Metals</Text>
            </LinearGradient>
            <Text style={styles.subtitle}>Live Prices • Interactive Charts • Smart Alerts</Text>
            
            {alerts.length > 0 && (
              <TouchableOpacity style={styles.alertsBadge}>
                <Text style={styles.alertsText}>🚨 {alerts.length} Active Alerts</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          <Animated.View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Markets</Text>
              <Text style={styles.statValue}>{weeklyDataList.length}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Gainers</Text>
              <Text style={styles.statValue}>
                {weeklyDataList.filter(data => data.current.change_24h > 0).length}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Alerts</Text>
              <Text style={styles.statValue}>{alerts.length}</Text>
            </View>
          </Animated.View>

          <View style={styles.cardsContainer}>
            <FlatList
              data={weeklyDataList}
              renderItem={renderMetalCard}
              keyExtractor={(item) => item.metal}
              numColumns={2}
              columnWrapperStyle={styles.cardRow}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>

          <Animated.View 
            style={[
              styles.footer,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.footerText}>
              💡 Swipe left on cards to set price alerts
            </Text>
            <Text style={styles.footerText}>
              ⭐ Swipe right to add to watchlist
            </Text>
            <Text style={styles.footerSubtext}>
              Pull down to refresh • Tap for detailed analytics
            </Text>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: '#888888',
    marginTop: 8,
    fontSize: 14,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  titleGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 16,
  },
  alertsBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  alertsText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333333',
  },
  cardsContainer: {
    flex: 1,
  },
  cardWrapper: {
    flex: 1,
  },
  cardRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  footer: {
    paddingTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default HomeScreen;