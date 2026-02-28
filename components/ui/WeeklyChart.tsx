import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/constants/colors';

export interface WeeklyChartProps {
  data: { day: string; steps: number; date: string }[];
  goal: number;
}

const MAX_BAR_HEIGHT = 120;
const SHORT_DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function formatSteps(steps: number): string {
  if (steps === 0) return '0';
  if (steps >= 10000) return `${(steps / 1000).toFixed(0)}k`;
  if (steps >= 1000) return `${(steps / 1000).toFixed(1)}k`;
  return String(steps);
}

function getTodayDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function WeeklyChart({ data, goal }: WeeklyChartProps) {
  const today = getTodayDate();
  const maxSteps = Math.max(goal, ...data.map((d) => d.steps));
  const safeMax = maxSteps > 0 ? maxSteps : 1;
  const goalLinePosition = (goal / safeMax) * MAX_BAR_HEIGHT;

  return (
    <View className="bg-white rounded-2xl border border-border p-4">
      <Text className="text-base font-bold text-neutral-dark mb-4">
        This Week
      </Text>

      {/* Chart area */}
      <View style={{ height: MAX_BAR_HEIGHT + 40, position: 'relative' }}>
        {/* Goal line */}
        <View
          style={{
            position: 'absolute',
            bottom: 20 + goalLinePosition,
            left: 0,
            right: 0,
            height: 1,
            borderStyle: 'dashed',
            borderWidth: 1,
            borderColor: Colors.mutedText,
            opacity: 0.5,
          }}
        />
        {/* Goal label */}
        <View
          style={{
            position: 'absolute',
            bottom: 22 + goalLinePosition,
            right: 0,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              color: Colors.mutedText,
            }}
          >
            Goal
          </Text>
        </View>

        {/* Bars */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            height: MAX_BAR_HEIGHT + 40,
            paddingBottom: 20,
          }}
        >
          {data.map((item, index) => {
            const isToday = item.date === today;
            const barHeight = item.steps > 0
              ? Math.max((item.steps / safeMax) * MAX_BAR_HEIGHT, 4)
              : 4;
            const meetsGoal = item.steps >= goal;

            return (
              <View
                key={item.date}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                {/* Step count label above bar */}
                {item.steps > 0 && (
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '600',
                      color: isToday ? Colors.primary : Colors.mutedText,
                      marginBottom: 2,
                    }}
                  >
                    {formatSteps(item.steps)}
                  </Text>
                )}

                {/* Bar */}
                <View
                  style={{
                    width: isToday ? 28 : 22,
                    height: barHeight,
                    borderRadius: 6,
                    backgroundColor: item.steps === 0
                      ? Colors.progressBg
                      : meetsGoal
                        ? Colors.primary
                        : isToday
                          ? Colors.primary
                          : `${Colors.primary}99`,
                  }}
                />

                {/* Day label below */}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isToday ? '700' : '500',
                    color: isToday ? Colors.primary : Colors.mutedText,
                    marginTop: 4,
                  }}
                >
                  {SHORT_DAY_LABELS[index]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
