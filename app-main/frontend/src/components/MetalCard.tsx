import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MetalPrice } from '../types/MetalPrice';
import MetalIcon from './MetalIcon';

interface Props {
  metal: MetalPrice;
  onPress: () => void;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // Account for padding and gap

const MetalCard: React.FC<Props> = ({ metal, onPress }) => {
  const formatPrice = (price: number) => 
    `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const getChangeColor = (change: number) => change >= 0 ? '#00C853' : '#FF1744';
  const getChangePrefix = (change: number) => change >= 0 ? '+' : '';

  const getMetalGradient = (metalName: string) => {
    switch (metalName.toLowerCase()) {
      case 'gold':
        return ['#FFD700', '#FFA000'];
      case 'silver':
        return ['#C0C0C0', '#757575'];
      case 'platinum':
        return ['#E5E4E2', '#9E9E9E'];
      case 'palladium':
        return ['#CED0CE', '#8BC34A'];
      default:
        return ['#FFD700', '#FFA000'];
    }
  };

  const gradientColors = getMetalGradient(metal.metal);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: gradientColors[1] + '20' }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <MetalIcon metal={metal.metal.toLowerCase()} size={36} />
        <View style={styles.headerText}>
          <Text style={styles.metalName}>{metal.metal}</Text>
          <Text style={styles.currentTime}>{metal.current_time}</Text>
        </View>
      </View>

      <View style={styles.priceSection}>
        <Text style={[styles.price, { color: gradientColors[0] }]}>
          {formatPrice(metal.price_per_gram_inr)}
        </Text>
        <Text style={styles.priceUnit}>per gram</Text>
      </View>

      <View style={styles.changeSection}>
        <Text style={[styles.change, { color: getChangeColor(metal.change_24h) }]}>
          {getChangePrefix(metal.change_24h)}{metal.change_24h.toFixed(2)}
        </Text>
        <Text style={[styles.changePercent, { color: getChangeColor(metal.change_pct) }]}>
          ({getChangePrefix(metal.change_pct)}{metal.change_pct.toFixed(2)}%)
        </Text>
      </View>

      <View style={[styles.indicator, { backgroundColor: gradientColors[0] }]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    color: '#888888',
    marginTop: 2,
  },
  priceSection: {
    marginBottom: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  priceUnit: {
    fontSize: 12,
    color: '#888888',
  },
  changeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  change: {
    fontSize: 14,
    fontWeight: '600',
  },
  changePercent: {
    fontSize: 12,
    fontWeight: '500',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    height: '100%',
  },
});

export default MetalCard;