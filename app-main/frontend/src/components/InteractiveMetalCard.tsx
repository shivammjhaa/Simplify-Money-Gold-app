import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MetalPrice } from '../types/MetalPrice';
import { WeeklyMetalData } from '../services/historicalData';
import MetalIcon from './MetalIcon';
import MiniChart from './MiniChart';

interface Props {
  metalData: WeeklyMetalData;
  onPress: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const InteractiveMetalCard: React.FC<Props> = ({ 
  metalData, 
  onPress, 
  onSwipeLeft, 
  onSwipeRight 
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const priceAnim = useRef(new Animated.Value(0)).current;
  const [displayPrice, setDisplayPrice] = useState(metalData.current.price_per_gram_inr);
  
  // Animate price changes
  useEffect(() => {
    const targetPrice = metalData.current.price_per_gram_inr;
    
    Animated.timing(priceAnim, {
      toValue: targetPrice,
      duration: 1500,
      useNativeDriver: false,
    }).start();
    
    // Animate price number counting
    const listener = priceAnim.addListener(({ value }) => {
      setDisplayPrice(value);
    });
    
    return () => priceAnim.removeListener(listener);
  }, [metalData.current.price_per_gram_inr]);

  const handlePressIn = () => {
    setIsPressed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: slideAnim } }],
    { useNativeDriver: true }
  );

  const handleGestureStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      if (translationX > 50 && onSwipeRight) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSwipeRight();
      } else if (translationX < -50 && onSwipeLeft) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSwipeLeft();
      }
      
      // Reset position
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const formatPrice = (price: number) => 
    `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const getChangeColor = (change: number) => change >= 0 ? '#00C853' : '#FF1744';
  const getChangePrefix = (change: number) => change >= 0 ? '+' : '';

  const getMetalGradient = (metalName: string, performance: number) => {
    const baseColors = {
      gold: ['#FFD700', '#FFA000'],
      silver: ['#C0C0C0', '#757575'],
      platinum: ['#E5E4E2', '#9E9E9E'],
      palladium: ['#CED0CE', '#8BC34A'],
    };
    
    const colors = baseColors[metalName.toLowerCase() as keyof typeof baseColors] || baseColors.gold;
    
    // Adjust opacity based on performance
    const opacity = performance >= 0 ? '40' : '30';
    return [colors[0] + opacity, colors[1] + opacity];
  };

  const gradientColors = getMetalGradient(metalData.metal, metalData.current.change_24h);
  const weeklyChange = metalData.weeklyChangePercent;

  return (
    <PanGestureHandler
      onGestureEvent={handleGestureEvent}
      onHandlerStateChange={handleGestureStateChange}
    >
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }, { translateX: slideAnim }] }
        ]}
      >
        <TouchableOpacity
          style={[styles.cardContainer, { width: cardWidth }]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={gradientColors}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <MetalIcon metal={metalData.metal.toLowerCase()} size={36} />
              <View style={styles.headerText}>
                <Text style={styles.metalName}>{metalData.metal}</Text>
                <Text style={styles.currentTime}>
                  {metalData.current.current_time.split(' ')[1]}
                </Text>
              </View>
            </View>

            <View style={styles.priceSection}>
              <Animated.Text style={[styles.price, { color: gradientColors[0].slice(0, 7) }]}>
                {formatPrice(displayPrice)}
              </Animated.Text>
              <Text style={styles.priceUnit}>per gram</Text>
            </View>

            <View style={styles.changeSection}>
              <Text style={[styles.change, { color: getChangeColor(metalData.current.change_24h) }]}>
                {getChangePrefix(metalData.current.change_24h)}{metalData.current.change_24h.toFixed(2)}
              </Text>
              <Text style={[styles.changePercent, { color: getChangeColor(metalData.current.change_pct) }]}>
                ({getChangePrefix(metalData.current.change_pct)}{metalData.current.change_pct.toFixed(2)}%)
              </Text>
            </View>

            {/* Mini Chart */}
            <View style={styles.miniChartContainer}>
              <MiniChart 
                data={metalData.historical} 
                width={cardWidth - 32} 
                height={40}
                color={weeklyChange >= 0 ? '#00C853' : '#FF1744'}
              />
            </View>

            {/* Weekly Performance */}
            <View style={styles.weeklyPerformance}>
              <Text style={styles.weeklyLabel}>7D</Text>
              <Text style={[
                styles.weeklyValue, 
                { color: getChangeColor(weeklyChange) }
              ]}>
                {getChangePrefix(weeklyChange)}{weeklyChange.toFixed(2)}%
              </Text>
            </View>

            {/* Interactive indicators */}
            <View style={styles.swipeIndicators}>
              <View style={[styles.swipeIndicator, styles.leftIndicator]} />
              <View style={[styles.swipeIndicator, styles.rightIndicator]} />
            </View>

            <View style={[styles.indicator, { backgroundColor: gradientColors[0].slice(0, 7) }]} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
    position: 'relative',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  metalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  currentTime: {
    fontSize: 10,
    color: '#CCCCCC',
    marginTop: 2,
  },
  priceSection: {
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  priceUnit: {
    fontSize: 11,
    color: '#BBBBBB',
  },
  changeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  change: {
    fontSize: 13,
    fontWeight: '600',
  },
  changePercent: {
    fontSize: 11,
    fontWeight: '500',
  },
  miniChartContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  weeklyPerformance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  weeklyLabel: {
    fontSize: 11,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  weeklyValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  swipeIndicators: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 2,
  },
  swipeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#555555',
  },
  leftIndicator: {
    opacity: 0.5,
  },
  rightIndicator: {
    opacity: 0.5,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    height: '100%',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
});

export default InteractiveMetalCard;