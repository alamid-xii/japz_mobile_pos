import { useRouter } from 'expo-router';
import { ArrowLeft, Download, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';

interface Activity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
}

const mockActivities: Activity[] = [
  { id: '1', action: 'Login', user: 'admin@restaurant.com', timestamp: '2024-11-20 14:30:00', details: 'Admin logged in' },
  { id: '2', action: 'Employee Added', user: 'admin@restaurant.com', timestamp: '2024-11-20 14:25:00', details: 'Added employee: Maria Santos' },
  { id: '3', action: 'Menu Updated', user: 'admin@restaurant.com', timestamp: '2024-11-20 14:20:00', details: 'Updated menu item: Adobo' },
  { id: '4', action: 'Settings Changed', user: 'admin@restaurant.com', timestamp: '2024-11-20 14:15:00', details: 'Enabled notifications' },
  { id: '5', action: 'Order Processed', user: 'cashier@restaurant.com', timestamp: '2024-11-20 14:10:00', details: 'Order #1234 completed' },
  { id: '6', action: 'Report Generated', user: 'admin@restaurant.com', timestamp: '2024-11-20 14:00:00', details: 'Sales report for Nov 20' },
  { id: '7', action: 'Backup Created', user: 'system', timestamp: '2024-11-20 13:00:00', details: 'Daily backup completed' },
  { id: '8', action: 'Employee Removed', user: 'admin@restaurant.com', timestamp: '2024-11-20 12:30:00', details: 'Removed inactive employee' },
];

export default function ActivitiesLogScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState(mockActivities);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const actionTypes = ['all', 'Login', 'Employee Added', 'Menu Updated', 'Order Processed'];

  const filteredActivities = selectedFilter === 'all' 
    ? activities 
    : activities.filter(a => a.action === selectedFilter);

  const handleClearLogs = () => {
    setActivities([]);
  };

  const renderActivityItem = ({ item }: { item: Activity }) => (
    <View
      style={{
        backgroundColor: Colors.light.card,
        borderRadius: Sizes.radius.md,
        padding: Sizes.spacing.md,
        marginBottom: Sizes.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: Colors.light.primary,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Sizes.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.xs }}>
            {item.action}
          </Text>
          <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs, marginBottom: Sizes.spacing.xs }}>
            {item.details}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
          {item.user}
        </Text>
        <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
          {item.timestamp}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Sizes.spacing.lg,
          paddingVertical: Sizes.spacing.md,
          backgroundColor: Colors.light.card,
          borderBottomWidth: 1,
          borderBottomColor: Colors.light.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Sizes.spacing.md }}>
          <ArrowLeft size={24} color={Colors.light.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', color: Colors.light.foreground, flex: 1 }}>
          Activities Log
        </Text>
      </View>

      {/* Info Section */}
      <View
        style={{
          backgroundColor: Colors.light.card,
          paddingHorizontal: Sizes.spacing.lg,
          paddingVertical: Sizes.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: Colors.light.border,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', color: Colors.light.foreground }}>
          Total Activities: {filteredActivities.length}
        </Text>
        <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm }}>
          <TouchableOpacity
            style={{
              paddingHorizontal: Sizes.spacing.md,
              paddingVertical: Sizes.spacing.sm,
              borderRadius: Sizes.radius.sm,
              backgroundColor: '#FFCE1B',
              flexDirection: 'row',
              alignItems: 'center',
              gap: Sizes.spacing.xs,
            }}
          >
            <Download size={16} color="#030213" />
            <Text style={{ color: '#030213', fontWeight: '600', fontSize: Sizes.typography.xs }}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Sizes.spacing.lg,
          paddingVertical: Sizes.spacing.md,
          gap: Sizes.spacing.sm,
        }}
      >
        {actionTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={{
              paddingHorizontal: Sizes.spacing.md,
              paddingVertical: Sizes.spacing.sm,
              borderRadius: 20,
              backgroundColor: selectedFilter === type ? '#FFCE1B' : Colors.light.card,
              borderWidth: 1,
              borderColor: selectedFilter === type ? '#FFCE1B' : Colors.light.border,
            }}
            onPress={() => setSelectedFilter(type)}
          >
            <Text
              style={{
                fontSize: Sizes.typography.xs,
                fontWeight: '600',
                color: selectedFilter === type ? '#030213' : Colors.light.foreground,
                textTransform: 'capitalize',
              }}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Activities List */}
      {filteredActivities.length > 0 ? (
        <FlatList
          data={filteredActivities}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Sizes.spacing.lg }}
          scrollEnabled={true}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.base }}>
            No activities found
          </Text>
        </View>
      )}

      {/* Clear Logs Button */}
      {activities.length > 0 && (
        <View
          style={{
            paddingHorizontal: Sizes.spacing.lg,
            paddingBottom: Sizes.spacing.lg,
            backgroundColor: Colors.light.background,
            borderTopWidth: 1,
            borderTopColor: Colors.light.border,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: '#FEE2E2',
              paddingVertical: Sizes.spacing.md,
              borderRadius: Sizes.radius.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Sizes.spacing.sm,
            }}
            onPress={handleClearLogs}
          >
            <Trash2 size={18} color="#991B1B" />
            <Text style={{ fontWeight: '600', color: '#991B1B', fontSize: Sizes.typography.base }}>
              Clear All Logs
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
