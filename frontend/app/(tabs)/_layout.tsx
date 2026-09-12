import { Tabs } from "expo-router";
import { NativeTabs, Icon as NativeIcon, Label } from "expo-router/unstable-native-tabs";
import Feather from "@react-native-vector-icons/feather";
import { Platform } from "react-native";

import { useTheme } from "@/src/theme";
import { fonts } from "@/src/theme";

const useNative = Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

export default function TabsLayout() {
  const { colors } = useTheme();

  if (useNative) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeIcon sf="sun.max" />
          <Label>Today</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="calendar">
          <NativeIcon sf="calendar" />
          <Label>Calendar</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="search">
          <NativeIcon sf="magnifyingglass" />
          <Label>Search</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="milestones">
          <NativeIcon sf="flag" />
          <Label>Milestones</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeIcon sf="rosette" />
          <Label>Progress</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => <Feather name="sun" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => <Feather name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="milestones"
        options={{
          title: "Milestones",
          tabBarIcon: ({ color, size }) => <Feather name="flag" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => <Feather name="award" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
