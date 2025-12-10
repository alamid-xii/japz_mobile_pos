import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { TrendingUpIcon, MessageSquareIcon, StarIcon, AlertCircleIcon } from 'lucide-react-native';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const FeedbackDashboard = ({ token }) => {
  const [analytics, setAnalytics] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchFeedbackData();
    const interval = setInterval(fetchFeedbackData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchFeedbackData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [analyticsRes, feedbackRes] = await Promise.all([
        axios.get(`${API_URL}/api/feedback/analytics`, { headers }),
        axios.get(`${API_URL}/api/feedback?limit=20`, { headers })
      ]);

      setAnalytics(analyticsRes.data);
      setFeedbackList(feedbackRes.data.feedback);
    } catch (error) {
      console.error('Error fetching feedback data:', error);
      Alert.alert('Error', 'Failed to load feedback data');
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => {
    if (!analytics) return null;

    return (
      <ScrollView style={styles.tabContent}>
        {/* Overall Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{analytics.summary.overallScore}</Text>
            <Text style={styles.scoreLabel}>/5.0</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>Overall Rating</Text>
            <Text style={styles.scoreSub}>
              Based on {analytics.summary.totalFeedback} feedback responses
            </Text>
          </View>
        </View>

        {/* Rating Distribution */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rating Distribution</Text>
          {[5, 4, 3, 2, 1].map((star) => (
            <View key={star} style={styles.ratingRow}>
              <View style={styles.starLabel}>
                {[...Array(star)].map((_, i) => (
                  <StarIcon key={i} size={14} color="#FFD700" fill="#FFD700" />
                ))}
              </View>
              <View style={styles.ratingBar}>
                <View
                  style={[
                    styles.ratingBarFill,
                    {
                      width: `${(analytics.summary.ratingDistribution[star] / analytics.summary.totalFeedback) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.ratingCount}>{analytics.summary.ratingDistribution[star]}</Text>
            </View>
          ))}
        </View>

        {/* Sentiment Distribution */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sentiment Breakdown</Text>
          <View style={styles.sentimentGrid}>
            <View style={styles.sentimentItem}>
              <View style={[styles.sentimentBadge, styles.positiveBadge]}>
                <Text style={styles.sentimentEmoji}>😊</Text>
              </View>
              <Text style={styles.sentimentLabel}>Positive</Text>
              <Text style={styles.sentimentValue}>{analytics.summary.sentimentCount.positive}</Text>
            </View>
            <View style={styles.sentimentItem}>
              <View style={[styles.sentimentBadge, styles.neutralBadge]}>
                <Text style={styles.sentimentEmoji}>😐</Text>
              </View>
              <Text style={styles.sentimentLabel}>Neutral</Text>
              <Text style={styles.sentimentValue}>{analytics.summary.sentimentCount.neutral}</Text>
            </View>
            <View style={styles.sentimentItem}>
              <View style={[styles.sentimentBadge, styles.negativeBadge]}>
                <Text style={styles.sentimentEmoji}>😞</Text>
              </View>
              <Text style={styles.sentimentLabel}>Negative</Text>
              <Text style={styles.sentimentValue}>{analytics.summary.sentimentCount.negative}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderIssuesTab = () => {
    if (!analytics || analytics.topThemes.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No themes identified yet</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Issues & Themes</Text>
          {analytics.topThemes.map((item, index) => (
            <View key={index} style={styles.themeItem}>
              <View style={styles.themeRank}>
                <Text style={styles.themeRankText}>{index + 1}</Text>
              </View>
              <View style={styles.themeInfo}>
                <Text style={styles.themeName}>{item.theme}</Text>
                <View style={styles.themeBar}>
                  <View
                    style={[
                      styles.themeBarFill,
                      { width: `${item.percentage}%` },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.themeStats}>
                <Text style={styles.themeMentions}>{item.count}</Text>
                <Text style={styles.themePercent}>{item.percentage}%</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderRecentTab = () => {
    if (feedbackList.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No feedback yet</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={feedbackList}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.feedbackItem}>
            <View style={styles.feedbackHeader}>
              <View style={styles.feedbackRating}>
                {[...Array(5)].map((_, i) => (
                  <StarIcon
                    key={i}
                    size={16}
                    color={i < item.rating ? '#FFD700' : '#DDD'}
                    fill={i < item.rating ? '#FFD700' : 'none'}
                  />
                ))}
              </View>
              <Text style={styles.feedbackDate}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {item.orderNumber && (
              <Text style={styles.feedbackOrder}>Order #{item.orderNumber}</Text>
            )}
            {item.comment && (
              <Text style={styles.feedbackComment} numberOfLines={3}>
                {item.comment}
              </Text>
            )}
            {item.themes && item.themes.length > 0 && (
              <View style={styles.feedbackTags}>
                {item.themes.map((theme, idx) => (
                  <View key={idx} style={styles.feedbackTag}>
                    <Text style={styles.feedbackTagText}>{theme}</Text>
                  </View>
                ))}
              </View>
            )}
            {item.sentiment && (
              <View
                style={[
                  styles.sentimentBadgeSmall,
                  item.sentiment === 'positive' && styles.sentimentPositiveSmall,
                  item.sentiment === 'negative' && styles.sentimentNegativeSmall,
                ]}
              >
                <Text style={styles.sentimentBadgeText}>{item.sentiment.toUpperCase()}</Text>
              </View>
            )}
          </View>
        )}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading feedback data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <TrendingUpIcon size={20} color={activeTab === 'overview' ? '#FF6B6B' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'issues' && styles.activeTab]}
          onPress={() => setActiveTab('issues')}
        >
          <AlertCircleIcon size={20} color={activeTab === 'issues' ? '#FF6B6B' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'issues' && styles.activeTabText]}>
            Issues
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
          onPress={() => setActiveTab('recent')}
        >
          <MessageSquareIcon size={20} color={activeTab === 'recent' ? '#FF6B6B' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>
            Recent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'issues' && renderIssuesTab()}
      {activeTab === 'recent' && renderRecentTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FF6B6B',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#FFF',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  scoreSub: {
    fontSize: 13,
    color: '#999',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starLabel: {
    width: 60,
    flexDirection: 'row',
    gap: 2,
  },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#EEE',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
  ratingCount: {
    width: 30,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  sentimentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sentimentItem: {
    alignItems: 'center',
  },
  sentimentBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  positiveBadge: {
    backgroundColor: '#E8F5E9',
  },
  neutralBadge: {
    backgroundColor: '#FFF9E6',
  },
  negativeBadge: {
    backgroundColor: '#FFEBEE',
  },
  sentimentEmoji: {
    fontSize: 28,
  },
  sentimentLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  sentimentValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  themeRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  themeRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  themeInfo: {
    flex: 1,
    marginRight: 12,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  themeBar: {
    height: 6,
    backgroundColor: '#EEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  themeBarFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 3,
  },
  themeStats: {
    alignItems: 'flex-end',
  },
  themeMentions: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  themePercent: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
  },
  feedbackItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackRating: {
    flexDirection: 'row',
    gap: 2,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#999',
  },
  feedbackOrder: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    marginBottom: 8,
  },
  feedbackComment: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginBottom: 8,
  },
  feedbackTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  feedbackTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  feedbackTagText: {
    fontSize: 11,
    color: '#666',
  },
  sentimentBadgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sentimentPositiveSmall: {
    backgroundColor: '#E8F5E9',
  },
  sentimentNegativeSmall: {
    backgroundColor: '#FFEBEE',
  },
  sentimentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
});

export default FeedbackDashboard;
