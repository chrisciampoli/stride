import React from 'react';
import { ScrollView, Text, Pressable } from 'react-native';

interface CategoryPillsProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryPills({ categories, selected, onSelect }: CategoryPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
    >
      {categories.map((cat) => (
        <Pressable
          key={cat}
          onPress={() => onSelect(cat)}
          className={`px-4 py-2 rounded-full border ${
            selected === cat
              ? 'bg-primary border-primary'
              : 'bg-white border-border'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              selected === cat ? 'text-neutral-dark' : 'text-muted-text'
            }`}
          >
            {cat}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
