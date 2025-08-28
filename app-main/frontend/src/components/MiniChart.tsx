import React from 'react';
import { View, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { HistoricalDataPoint } from '../services/historicalData';

interface Props {
  data: HistoricalDataPoint[];
  width: number;
  height: number;
  color: string;
}

const MiniChart: React.FC<Props> = ({ data, width, height, color }) => {
  if (!data || data.length === 0) {
    return <View style={{ width, height, backgroundColor: 'transparent' }} />;
  }

  const chartData = data.map((point, index) => ({
    value: point.price,
    label: '',
    dataPointText: '',
  }));

  return (
    <View style={{ width, height }}>
      <LineChart
        data={chartData}
        width={width}
        height={height}
        color={color}
        thickness={2}
        hideDataPoints={true}
        hideAxesAndRules={true}
        hideYAxisText={true}
        hideXAxisText={true}
        isAnimated={true}
        animationDuration={1200}
        curved={true}
        areaChart={true}
        startFillColor={color}
        endFillColor="transparent"
        startOpacity={0.4}
        endOpacity={0.1}
        backgroundColor="transparent"
        yAxisColor="transparent"
        xAxisColor="transparent"
      />
    </View>
  );
};

export default MiniChart;