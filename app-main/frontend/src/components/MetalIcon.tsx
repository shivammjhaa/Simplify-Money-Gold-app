import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

interface Props {
  metal: string;
  size?: number;
}

const MetalIcon: React.FC<Props> = ({ metal, size = 24 }) => {
  const getIconProps = (metalName: string) => {
    switch (metalName.toLowerCase()) {
      case 'gold':
        return {
          icon: 'star' as const,
          color: '#FFD700',
          library: 'Ionicons' as const,
        };
      case 'silver':
        return {
          icon: 'diamond' as const,
          color: '#C0C0C0',
          library: 'Ionicons' as const,
        };
      case 'platinum':
        return {
          icon: 'trophy' as const,
          color: '#E5E4E2',
          library: 'Ionicons' as const,
        };
      case 'palladium':
        return {
          icon: 'diamond-outline' as const,
          color: '#CED0CE',
          library: 'Ionicons' as const,
        };
      default:
        return {
          icon: 'help-circle' as const,
          color: '#888888',
          library: 'Ionicons' as const,
        };
    }
  };

  const iconProps = getIconProps(metal);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {iconProps.library === 'Ionicons' ? (
        <Ionicons
          name={iconProps.icon}
          size={size}
          color={iconProps.color}
        />
      ) : (
        <MaterialIcons
          name={iconProps.icon as any}
          size={size}
          color={iconProps.color}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MetalIcon;