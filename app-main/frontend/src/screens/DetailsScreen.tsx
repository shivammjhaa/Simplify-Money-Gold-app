import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import * as Haptics from 'expo-haptics';

import { RootStackParamList } from '../../App';
import { apiService } from '../services/api';
import { generateWeeklyData, WeeklyMetalData } from '../services/historicalData';
import MetalIcon from '../components/MetalIcon';
import PriceDetailCard from '../components/PriceDetailCard';

type DetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Details'>;
type DetailsScreenRouteProp = RouteProp<RootStackParamList, 'Details'>;

interface Props {
  navigation: DetailsScreenNavigationProp;
  route: DetailsScreenRouteProp;
}

const { width } = Dimensions.get('window');

const DetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { metal } = route.params;
  const [weeklyData, setWeeklyData] = useState<WeeklyMetalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '3D' | '7D'>('7D');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const priceCountAnim = useRef(new Animated.Value(0)).current;
  const [displayPrice, setDisplayPrice] = useState(0);

  useEffect(() => {
    fetchMetalData();
    
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [metal]);

  useEffect(() => {
    if (weeklyData) {
      // Animate price counting
      Animated.timing(priceCountAnim, {
        toValue: weeklyData.current.price_per_gram_inr,
        duration: 2000,
        useNativeDriver: false,
      }).start();

      const listener = priceCountAnim.addListener(({ value }) => {
        setDisplayPrice(value);
      });

      return () => priceCountAnim.removeListener(listener);
    }
  }, [weeklyData]);

  const fetchMetalData = async () => {
    try {
      const metalPrice = await apiService.getMetalPrice(metal.toLowerCase());
      const enhancedData = generateWeeklyData(metalPrice);
      setWeeklyData(enhancedData);
    } catch (error) {
      console.error('Error fetching metal data:', error);
      Alert.alert(
        'Error',
        'Failed to fetch metal data. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchMetalData();
  };

  const handleTimeframeChange = (timeframe: '1D' | '3D' | '7D') => {
    setSelectedTimeframe(timeframe);
    Haptics.selectionAsync();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading {metal} analytics...</Text>
      </View>
    );
  }

  if (!weeklyData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load metal details</Text>
      </View>
    );
  }

  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const formatChange = (change: number, isPercentage = false) => {
    const prefix = change >= 0 ? '+' : '';
    const suffix = isPercentage ? '%' : '';
    return `${prefix}${change.toFixed(2)}${suffix}`;
  };

  const getChangeColor = (change: number) => change >= 0 ? '#00C853' : '#FF1744';
  
  const getMetalGradient = (metalName: string) => {
    switch (metalName.toLowerCase()) {
      case 'gold': return ['#FFD700', '#FFA000'];
      case 'silver': return ['#C0C0C0', '#757575'];
      case 'platinum': return ['#E5E4E2', '#9E9E9E'];
      case 'palladium': return ['#CED0CE', '#8BC34A'];
      default: return ['#FFD700', '#FFA000'];
    }
  };

  const gradientColors = getMetalGradient(weeklyData.metal);
  
  // Prepare chart data
  const chartData = weeklyData.historical.map((point, index) => ({
    value: point.price,
    label: point.date.split('-')[2], // Day of month
    dataPointText: formatPrice(point.price),
  }));

  const selectedChange = weeklyData.dayChanges[selectedTimeframe];

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
            />
          }
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
              colors={[gradientColors[0] + '40', gradientColors[1] + '20']}
              style={styles.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MetalIcon metal={weeklyData.metal.toLowerCase()} size={80} />
              <Text style={styles.metalName}>{weeklyData.metal}</Text>
              <Animated.Text style={styles.currentPrice}>
                {formatPrice(displayPrice)}
              </Animated.Text>
              <Text style={styles.priceUnit}>per gram</Text>
              
              <View style={styles.changeContainer}>
                <Text style={[styles.changeValue, { color: getChangeColor(weeklyData.current.change_24h) }]}>
                  {formatChange(weeklyData.current.change_24h)}
                </Text>
                <Text style={[styles.changePercent, { color: getChangeColor(weeklyData.current.change_pct) }]}>
                  ({formatChange(weeklyData.current.change_pct, true)})
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Timeframe Selector */}
          <Animated.View 
            style={[
              styles.timeframeContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {(['1D', '3D', '7D'] as const).map((timeframe) => (
              <TouchableOpacity
                key={timeframe}
                style={[
                  styles.timeframeButton,
                  selectedTimeframe === timeframe && styles.timeframeButtonActive
                ]}
                onPress={() => handleTimeframeChange(timeframe)}
              >
                <Text style={[
                  styles.timeframeText,
                  selectedTimeframe === timeframe && styles.timeframeTextActive
                ]}>
                  {timeframe}
                </Text>
                <Text style={[
                  styles.timeframeChange,
                  { color: getChangeColor(weeklyData.dayChanges[timeframe]) }
                ]}>
                  {formatChange(weeklyData.dayChanges[timeframe], true)}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* Interactive Chart */}
          <Animated.View 
            style={[
              styles.chartContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <Text style={styles.chartTitle}>Price Trend ({selectedTimeframe})</Text>
            <View style={styles.chartWrapper}>
              <LineChart
                data={chartData}
                width={width - 48}
                height={200}
                color={getChangeColor(selectedChange)}
                thickness={3}
                dataPointsColor={gradientColors[0]}
                dataPointsRadius={4}
                isAnimated={true}
                animationDuration={1000}
                curved={true}
                areaChart={true}
                startFillColor={getChangeColor(selectedChange)}
                endFillColor="transparent"
                startOpacity={0.3}
                endOpacity={0.1}
                yAxisTextStyle={{ color: '#888888', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#888888', fontSize: 10 }}
                backgroundColor="transparent"
                showVerticalLines={false}
                hideRules={true}
              />
            </View>
            
            {/* Chart Stats */}
            <View style={styles.chartStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Weekly High</Text>
                <Text style={[styles.statValue, { color: '#00C853' }]}>
                  {formatPrice(weeklyData.weeklyHigh)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Weekly Low</Text>
                <Text style={[styles.statValue, { color: '#FF1744' }]}>
                  {formatPrice(weeklyData.weeklyLow)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Weekly Change</Text>
                <Text style={[styles.statValue, { color: getChangeColor(weeklyData.weeklyChangePercent) }]}>
                  {formatChange(weeklyData.weeklyChangePercent, true)}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Market Details */}
          <Animated.View 
            style={[
              styles.detailsContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <Text style={styles.sectionTitle}>Market Details</Text>
            
            <PriceDetailCard
              title="Previous Close"
              value={formatPrice(weeklyData.current.prev_close_price)}
              subtitle="Last trading session close"
            />
            
            <PriceDetailCard
              title="Open Price"
              value={formatPrice(weeklyData.current.open_price)}
              subtitle="Today's opening price"
            />
            
            <PriceDetailCard
              title="Day's High"
              value={formatPrice(weeklyData.current.high_price)}
              subtitle="Highest price today"
            />
            
            <PriceDetailCard
              title="Day's Low"
              value={formatPrice(weeklyData.current.low_price)}
              subtitle="Lowest price today"
            />
          </Animated.View>

          {/* Timestamp */}
          <Animated.View 
            style={[
              styles.timestampContainer,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.timestampTitle}>Last Updated</Text>
            <Text style={styles.timestamp}>{weeklyData.current.current_time}</Text>
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
    backgroundColor: '#0c0c0c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  headerGradient: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 16,
  },
  metalName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  priceUnit: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  changePercent: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeframeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 8,
  },
  timeframeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  timeframeButtonActive: {
    backgroundColor: '#FFD700',
  },
  timeframeText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },
  timeframeTextActive: {
    color: '#000000',
  },
  timeframeChange: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  timestampContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    alignItems: 'center',
  },
  timestampTitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
});

export default DetailsScreen;