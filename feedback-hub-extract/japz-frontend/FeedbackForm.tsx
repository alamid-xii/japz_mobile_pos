import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { StarIcon } from 'lucide-react-native';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const FeedbackForm = ({ orderNumber, onSubmitSuccess }) => {
  const [rating, setRating] = useState(0); 
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);

  const tags = ['Good Food', 'Fast Service', 'Clean', 'Friendly Staff', 'Good Value', 'Will Return'];

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/feedback/submit`, {
        orderNumber: orderNumber || null,
        rating,
        tags: selectedTags,
        comment: comment || null,
      });

      Alert.alert('Success', 'Thank you for your feedback!');
      setRating(0);
      setComment('');
      setSelectedTags([]);
      
      if (onSubmitSuccess) {
        onSubmitSuccess(response.data.feedback);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
      console.error('Feedback submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Share Your Feedback</Text>
        {orderNumber && <Text style={styles.orderNumber}>Order #{orderNumber}</Text>}
      </View>

      {/* Rating Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How would you rate us?</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <StarIcon
                size={40}
                color={star <= rating ? '#FFD700' : '#E0E0E0'}
                fill={star <= rating ? '#FFD700' : 'none'}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Tags Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What impressed you? (Optional)</Text>
        <View style={styles.tagsContainer}>
          {tags.map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[
                styles.tag,
                selectedTags.includes(tag) && styles.tagSelected
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  selectedTags.includes(tag) && styles.tagTextSelected
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Comment Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Any additional comments? (Optional)</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Tell us more..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          value={comment}
          onChangeText={setComment}
          maxLength={500}
        />
        <Text style={styles.charCount}>{comment.length}/500</Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </Text>
      </TouchableOpacity>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    color: '#888',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  starButton: {
    padding: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#F5F5F5',
  },
  tagSelected: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  tagText: {
    fontSize: 14,
    color: '#333',
  },
  tagTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  spacer: {
    height: 20,
  },
});

export default FeedbackForm;
