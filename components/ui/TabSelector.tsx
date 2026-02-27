import React from 'react';
import { View, Text, Pressable } from 'react-native';

type TabSelectorVariant = 'underline' | 'pill';

interface Tab {
  key: string;
  label: string;
}

interface TabSelectorProps {
  variant?: TabSelectorVariant;
  tabs: Tab[];
  activeKey: string;
  onTabChange: (key: string) => void;
}

export function TabSelector({
  variant = 'underline',
  tabs,
  activeKey,
  onTabChange,
}: TabSelectorProps) {
  if (variant === 'pill') {
    return (
      <View className="bg-white p-1.5 rounded-xl flex-row">
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              className={`
                flex-1 py-2.5 rounded-lg items-center
                ${isActive ? 'bg-primary' : ''}
              `}
            >
              <Text
                className={`
                  text-sm font-semibold
                  ${isActive ? 'text-neutral-dark' : 'text-muted-text'}
                `}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View className="flex-row border-b border-border">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            className={`
              flex-1 pb-3 items-center
              ${isActive ? 'border-b-[3px] border-primary' : ''}
            `}
          >
            <Text
              className={`
                text-sm font-semibold
                ${isActive ? 'text-neutral-dark' : 'text-muted-text'}
              `}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
