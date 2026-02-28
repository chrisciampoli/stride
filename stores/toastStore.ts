import { create } from 'zustand';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  variant: ToastVariant;
  show: (message: string, variant?: ToastVariant) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  variant: 'success',
  show: (message, variant = 'success') => {
    set({ visible: true, message, variant });
    setTimeout(() => set({ visible: false }), 3000);
  },
  hide: () => set({ visible: false }),
}));
