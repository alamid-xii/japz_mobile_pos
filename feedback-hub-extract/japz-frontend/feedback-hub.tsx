import { ChevronDown, Star, RefreshCw, AlertCircle, Loader } from 'lucide-react-native';
import { useState, useCallback, useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { feedbackAPI } from '../../services/api';

interface FeedbackItem {
  id: number;
  orderNumber?: string;
  rating: number;
  comment?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  themes?: string[];
  aiAnalysis?: any;
  status: 'pending' | 'processed' | 'archived';
  createdAt: string;
  processed: boolean;
}

const statusColors = {
  pending: '#F59E0B',
  processed: '#3B82F6',
  archived: '#10B981',
};

const sentimentColors = {
  positive: '#10B981',
  neutral: '#6B7280',
  negative: '#EF4444',
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

const SentimentBadge = ({ sentiment }: { sentiment?: string }) => {
  if (!sentiment) return null;
  const color = sentimentColors[sentiment as keyof typeof sentimentColors] || sentimentColors.neutral;
  return (
    <View
      style={{
        paddingHorizontal: Sizes.spacing.sm,
        paddingVertical: 4,
        borderRadius: Sizes.radius.sm,
        backgroundColor: color + '20',
        marginTop: Sizes.spacing.sm,
      }}
    >
      <Text style={{ color, fontWeight: '600', fontSize: Sizes.typography.xs, textTransform: 'capitalize' }}>
        {sentiment}
      </Text>
    </View>
  );
};

export default function FeedbackHubScreen() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | FeedbackItem['status']>('all');
  const [showTimePeriodDropdown, setShowTimePeriodDropdown] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Prevent back navigation
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  // Fetch feedback data
  const fetchFeedback = async () => {
    try {
      setError(null);
      // Fetch all feedback (pass 'all' to get all statuses)
      const response = await feedbackAPI.getAll('all', 100, 0);
      
      if (response.data && response.data.feedback) {
        console.log('✅ Fetched feedback:', response.data.feedback.length, 'items');
        console.log('📋 Feedback details:', response.data.feedback.slice(0, 3).map((f: FeedbackItem) => ({
          id: f.id,
          orderNumber: f.orderNumber,
          sentiment: f.sentiment,
          rating: f.rating,
          comment: f.comment ? f.comment.substring(0, 30) : 'no comment'
        })));
        setFeedback(response.data.feedback);
      } else {
        console.log('⚠️ No feedback data in response');
        setFeedback([]);
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load feedback. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load feedback on mount and auto-refresh every 10 seconds
  useEffect(() => {
    setLoading(true);
    fetchFeedback();

    // Auto-refresh every 10 seconds for real-time updates
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing feedback...');
      fetchFeedback();
    }, 10 * 1000); // 10 seconds

    // Cleanup interval on unmount
    return () => clearInterval(autoRefreshInterval);
  }, []);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFeedback();
  }, [filterStatus]);

  const filteredFeedback = feedback.filter(f =>
    filterStatus === 'all' || f.status === filterStatus
  );

  // Check if feedback is newly created (within last 60 seconds)
  const isNewFeedback = (createdAt: string): boolean => {
    const feedbackTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffSeconds = (now - feedbackTime) / 1000;
    return diffSeconds < 60; // Show "NEW" badge for first 60 seconds
  };

  const toggleExpand = (id: number) => {
    setExpanded(expanded === id ? null : id);
  };

  const updateFeedbackStatus = async (id: number, newStatus: FeedbackItem['status']) => {
    try {
      await feedbackAPI.update(id, { status: newStatus });
      setFeedback(feedback.map(f =>
        f.id === id ? { ...f, status: newStatus } : f
      ));
    } catch (err) {
      console.error('Error updating feedback:', err);
      setError('Failed to update feedback');
    }
  };

  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
    : '0.0';
  
  const totalFeedback = feedback.length;
  const processedCount = feedback.filter(f => f.status === 'processed').length;
  // Count feedback with positive sentiment (handle null values)
  const positiveCount = feedback.filter(f => f.sentiment && f.sentiment === 'positive').length;
  const positivePercentage = totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : 0;

  console.log('📊 Feedback Stats:', {
    totalFeedback,
    positiveCount,
    positivePercentage,
    feedback: feedback.map(f => ({ id: f.id, sentiment: f.sentiment, orderNumber: f.orderNumber }))
  });

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
        <ActivityIndicator size="large" color="#FFCE1B" />
        <Text style={{ marginTop: Sizes.spacing.md, color: Colors.light.mutedForeground }}>Loading feedback...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, marginTop: Sizes.spacing.lg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFCE1B" />
        }
      >
        {error && (
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#FEE2E2',
              borderRadius: Sizes.radius.md,
              padding: Sizes.spacing.md,
              marginBottom: Sizes.spacing.lg,
              alignItems: 'center',
              gap: Sizes.spacing.sm,
            }}
          >
            <AlertCircle size={20} color="#DC2626" />
            <Text style={{ color: '#DC2626', flex: 1, fontSize: Sizes.typography.sm }}>
              {error}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.lg, zIndex: 10 }}>
          <Text style={{ fontSize: Sizes.typography['2xl'], fontWeight: '700', marginBottom: Sizes.spacing.sm, color:'#ffce1b' }}>
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
              Positive Sentiment
            </Text>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', color: '#10B981', marginTop: 4 }}>
              {positiveCount} ({positivePercentage}%)
            </Text>
          </View>
        </View>

        {/* Filter */}
        <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.lg }}>
          {(['all', 'pending', 'processed', 'archived'] as const).map((status) => (
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
        {filteredFeedback.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: Sizes.spacing.lg * 2 }}>
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.base }}>
              No feedback found
            </Text>
          </View>
        ) : (
          filteredFeedback.map((item) => (
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Sizes.spacing.sm }}>
                    <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
                      {item.orderNumber || 'Anonymous'}
                    </Text>
                    {isNewFeedback(item.createdAt) && (
                      <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: '#fff', fontSize: Sizes.typography.xs, fontWeight: '700' }}>NEW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm, marginTop: 4 }}>
                    Rating: {item.rating}/5
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
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>

              {/* AI Sentiment Badge */}
              {item.sentiment && <SentimentBadge sentiment={item.sentiment} />}

              {expanded === item.id && (
                <View style={{ marginTop: Sizes.spacing.md, paddingTop: Sizes.spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border }}>
                  {/* Comment Section */}
                  {item.comment && (
                    <View style={{ marginBottom: Sizes.spacing.md }}>
                      <Text style={{ color: Colors.light.mutedForeground, fontWeight: '600', marginBottom: Sizes.spacing.sm, fontSize: Sizes.typography.sm }}>
                        Feedback
                      </Text>
                      <Text style={{ color: Colors.light.foreground, lineHeight: 20 }}>
                        {item.comment}
                      </Text>
                    </View>
                  )}

                  {/* AI Analysis Section */}
                  {item.aiAnalysis && (
                    <View style={{ marginBottom: Sizes.spacing.md, backgroundColor: '#F3F4F6', padding: Sizes.spacing.md, borderRadius: Sizes.radius.sm }}>
                      <Text style={{ color: Colors.light.mutedForeground, fontWeight: '600', marginBottom: Sizes.spacing.sm, fontSize: Sizes.typography.sm }}>
                        AI Analysis
                      </Text>
                      {item.themes && item.themes.length > 0 && (
                        <View style={{ marginBottom: Sizes.spacing.sm }}>
                          <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs, marginBottom: 4 }}>
                            Themes:
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                            {item.themes.map((theme, idx) => (
                              <View
                                key={idx}
                                style={{
                                  backgroundColor: '#DBEAFE',
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: Sizes.radius.sm,
                                }}
                              >
                                <Text style={{ color: '#1E40AF', fontSize: Sizes.typography.xs, fontWeight: '500' }}>
                                  {theme}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Status Update Section */}
                  <Text style={{ color: Colors.light.mutedForeground, fontWeight: '600', marginBottom: Sizes.spacing.sm, fontSize: Sizes.typography.sm }}>
                    Change Status
                  </Text>
                  <View style={{ gap: Sizes.spacing.sm }}>
                    {(['pending', 'processed', 'archived'] as const).map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={{
                          backgroundColor: item.status === status ? statusColors[status] : Colors.light.muted,
                          paddingVertical: Sizes.spacing.sm,
                          borderRadius: Sizes.radius.sm,
                          alignItems: 'center',
                        }}
                        onPress={() => updateFeedbackStatus(item.id, status)}
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
          ))
        )}
      </ScrollView>
    </View>
  );
}