import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import HomeScreen from './src/screens/HomeScreen';
import DetailsScreen from './src/screens/DetailsScreen';

export type RootStackParamList = {
  Home: undefined;
  Details: { metal: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#0c0c0c" />
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#0c0c0c',
              },
              headerTintColor: '#ffffff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              gestureEnabled: true,
              cardStyleInterpolator: ({ current, layouts }) => {
                return {
                  cardStyle: {
                    transform: [
                      {
                        translateX: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [layouts.screen.width, 0],
                        }),
                      },
                    ],
                  },
                };
              },
            }}
          >
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{
                title: 'Simplify Money',
                headerStyle: {
                  backgroundColor: '#0c0c0c',
                },
              }}
            />
            <Stack.Screen 
              name="Details" 
              component={DetailsScreen}
              options={({ route }) => ({
                title: `${route.params.metal} Details`,
              })}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}