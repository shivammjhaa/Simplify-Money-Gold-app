import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  value: string;
  subtitle?: string;
}

const PriceDetailCard: React.FC<Props> = ({ title, value, subtitle }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
});

export default PriceDetailCard;