import React from 'react';
import { View, Text } from 'react-native';

interface MessageBubbleProps {
  content: string;
  isSent: boolean;
  time: string;
  isActivity?: boolean;
  activityTitle?: string;
  activitySubtitle?: string;
}

export function MessageBubble({
  content,
  isSent,
  time,
  isActivity = false,
  activityTitle,
  activitySubtitle,
}: MessageBubbleProps) {
  if (isActivity) {
    return (
      <View className={`max-w-[80%] mb-3 ${isSent ? 'self-end' : 'self-start'}`}>
        <View className="bg-white border border-border rounded-2xl p-3 mb-1">
          <Text className="text-xs font-bold text-muted-text uppercase mb-1">
            ⚡ {activityTitle}
          </Text>
          {activitySubtitle && (
            <Text className="text-xs text-muted-text">{activitySubtitle}</Text>
          )}
          <Text className="text-sm text-neutral-dark mt-2">{content}</Text>
        </View>
        <Text
          className={`text-[10px] text-muted-text ${
            isSent ? 'text-right' : 'text-left'
          }`}
        >
          {time}
        </Text>
      </View>
    );
  }

  return (
    <View className={`max-w-[80%] mb-3 ${isSent ? 'self-end' : 'self-start'}`}>
      <View
        className={`rounded-2xl px-4 py-2.5 ${
          isSent ? 'bg-primary rounded-br-sm' : 'bg-white border border-border rounded-bl-sm'
        }`}
      >
        <Text
          className={`text-sm ${
            isSent ? 'text-neutral-dark' : 'text-neutral-dark'
          }`}
        >
          {content}
        </Text>
      </View>
      <Text
        className={`text-[10px] text-muted-text mt-1 ${
          isSent ? 'text-right' : 'text-left'
        }`}
      >
        {time}
      </Text>
    </View>
  );
}
