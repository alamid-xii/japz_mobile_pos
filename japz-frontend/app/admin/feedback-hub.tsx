import { ChevronDown, Star } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';

interface Feedback {
  id: string;
  name: string;
  email: string;
  rating: number;
  comment: string;
  date: string;
  status: 'new' | 'reviewed' | 'resolved';
}

const mockFeedback: Feedback[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    rating: 5,
    comment: 'Excellent service and delicious food! Highly recommend.',
    date: '2024-01-15',
    status: 'resolved',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    rating: 4,
    comment: 'Good food but the wait time was a bit long.',
    date: '2024-01-14',
    status: 'reviewed',
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    rating: 3,
    comment: 'Average experience. Could improve portion sizes.',
    date: '2024-01-13',
    status: 'new',
  },
];

const statusColors = {
  new: '#F59E0B',
  reviewed: '#3B82F6',
  resolved: '#10B981',
};

const getRatingColor = (rating: number) => {
  if (rating >= 4) return '#10B981';
  if (rating >= 3) return '#F59E0B';
  return '#EF4444';
};

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={16}
          color={i < rating ? '#FBBF24' : Colors.light.border}
          fill={i < rating ? '#FBBF24' : 'transparent'}
        />
      ))}
    </View>
  );
};

export default function FeedbackHubScreen() {
  const [feedback, setFeedback] = useState<Feedback[]>(mockFeedback);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | Feedback['status']>('all');
  const [showTimePeriodDropdown, setShowTimePeriodDropdown] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'all' | 'day' | 'week' | 'month'>('all');

  const filteredFeedback = feedback.filter(f =>
    filterStatus === 'all' || f.status === filterStatus
  );

  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  const updateStatus = (id: string, newStatus: Feedback['status']) => {
    setFeedback(feedback.map(f =>
      f.id === id ? { ...f, status: newStatus } : f
    ));
  };

  const avgRating = (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1);
  const totalFeedback = feedback.length;
  const newCount = feedback.filter(f => f.status === 'new').length;

  return (
    <View style={{ flex: 1, marginTop: Sizes.spacing.lg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.lg, zIndex: 10 }}>
          <Text style={{ fontSize: Sizes.typography.xl, fontWeight: '700' }}>
            Feedback Hub
          </Text>
          
          {/* Time Period Dropdown */}
          <View style={{ position: 'relative', zIndex: 100 }}>
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: Colors.light.border,
                borderRadius: Sizes.radius.sm,
                paddingHorizontal: Sizes.spacing.sm,
                paddingVertical: 6,
                backgroundColor: Colors.light.card,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
              onPress={() => setShowTimePeriodDropdown(!showTimePeriodDropdown)}
            >
              <Text style={{ fontSize: Sizes.typography.xs, color: Colors.light.foreground, fontWeight: '600', textTransform: 'capitalize' }}>
                {timePeriod === 'all' ? 'All Feedback' : timePeriod}
              </Text>
              <ChevronDown size={14} color={Colors.light.primary} />
            </TouchableOpacity>
            
            {showTimePeriodDropdown && (
              <View
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: -8,
                  borderWidth: 1,
                  borderColor: Colors.light.border,
                  borderRadius: Sizes.radius.sm,
                  backgroundColor: Colors.light.card,
                  zIndex: 1001,
                  minWidth: 120,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 5,
                }}
              >
                {(['all', 'day', 'week', 'month'] as const).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={{
                      paddingHorizontal: Sizes.spacing.sm,
                      paddingVertical: 8,
                      borderBottomWidth: period !== 'month' ? 1 : 0,
                      borderBottomColor: Colors.light.border,
                      backgroundColor: timePeriod === period ? '#F0F0F0' : 'transparent',
                    }}
                    onPress={() => {
                      setTimePeriod(period);
                      setShowTimePeriodDropdown(false);
                    }}
                  >
                    <Text style={{ fontSize: Sizes.typography.xs, fontWeight: timePeriod === period ? '700' : '400', color: Colors.light.foreground, textTransform: 'capitalize' }}>
                      {period === 'all' ? 'All Feedback' : period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.lg }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFBEB',
              borderRadius: Sizes.radius.md,
              padding: Sizes.spacing.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
              Avg Rating
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
                {avgRating}
              </Text>
              <StarRating rating={Math.round(parseFloat(avgRating))} />
            </View>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFBEB',
              borderRadius: Sizes.radius.md,
              padding: Sizes.spacing.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
              Total Feedback
            </Text>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginTop: 4 }}>
              {totalFeedback}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFBEB',
              borderRadius: Sizes.radius.md,
              padding: Sizes.spacing.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
              Needs Review
            </Text>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', color: '#F59E0B', marginTop: 4 }}>
              {newCount}
            </Text>
          </View>
        </View>

        {/* Filter */}
        <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.lg }}>
          {(['all', 'new', 'reviewed', 'resolved'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={{
                paddingVertical: Sizes.spacing.sm,
                paddingHorizontal: Sizes.spacing.md,
                borderRadius: Sizes.radius.sm,
                backgroundColor: filterStatus === status ? '#FFCE1B' : Colors.light.card,
                borderWidth: 1,
                borderColor: filterStatus === status ? '#FFCE1B' : Colors.light.border,
              }}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={{
                  color: filterStatus === status ? '#030213' : Colors.light.foreground,
                  fontWeight: '600',
                  fontSize: Sizes.typography.xs,
                  textTransform: 'capitalize',
                }}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feedback List */}
        {filteredFeedback.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={{
              backgroundColor: Colors.light.card,
              borderRadius: Sizes.radius.md,
              padding: Sizes.spacing.md,
              marginBottom: Sizes.spacing.md,
              borderLeftWidth: 4,
              borderLeftColor: statusColors[item.status],
            }}
            onPress={() => toggleExpand(item.id)}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Sizes.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: 4 }}>
                  {item.name}
                </Text>
                <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
                  {item.email}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: Sizes.spacing.sm,
                  paddingVertical: 4,
                  borderRadius: Sizes.radius.sm,
                  backgroundColor: statusColors[item.status] + '20',
                }}
              >
                <Text style={{ color: statusColors[item.status], fontWeight: '600', fontSize: Sizes.typography.xs }}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <StarRating rating={item.rating} />
              <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
                {item.date}
              </Text>
            </View>

            {expanded === item.id && (
              <View style={{ marginTop: Sizes.spacing.md, paddingTop: Sizes.spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border }}>
                <View style={{ marginBottom: Sizes.spacing.md }}>
                  <Text style={{ color: Colors.light.mutedForeground, fontWeight: '600', marginBottom: Sizes.spacing.sm, fontSize: Sizes.typography.sm }}>
                    Feedback
                  </Text>
                  <Text style={{ color: Colors.light.foreground, lineHeight: 20 }}>
                    {item.comment}
                  </Text>
                </View>

                <Text style={{ color: Colors.light.mutedForeground, fontWeight: '600', marginBottom: Sizes.spacing.sm, fontSize: Sizes.typography.sm }}>
                  Change Status
                </Text>
                <View style={{ gap: Sizes.spacing.sm }}>
                  {(['new', 'reviewed', 'resolved'] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={{
                        backgroundColor: item.status === status ? statusColors[status] : Colors.light.muted,
                        paddingVertical: Sizes.spacing.sm,
                        borderRadius: Sizes.radius.sm,
                        alignItems: 'center',
                      }}
                      onPress={() => updateStatus(item.id, status)}
                    >
                      <Text
                        style={{
                          color: item.status === status ? '#fff' : Colors.light.mutedForeground,
                          fontWeight: '600',
                          fontSize: Sizes.typography.sm,
                          textTransform: 'capitalize',
                        }}
                      >
                        Mark as {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}