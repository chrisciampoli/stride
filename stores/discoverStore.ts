import { create } from 'zustand';

interface DiscoverState {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

export const useDiscoverStore = create<DiscoverState>((set) => ({
  selectedCategory: 'All',
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
}));
