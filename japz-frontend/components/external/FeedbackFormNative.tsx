import { Send, Star } from 'lucide-react-native';
import { useState } from 'react';
import {
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors, Sizes } from '../../constants/colors';

interface FeedbackFormNativeProps {
  orderId?: string;
  onSubmit?: (rating: number, comment: string) => void;
}

export function FeedbackFormNative({
  orderId = 'JAPZ001',
  onSubmit,
}: FeedbackFormNativeProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit?.(rating, comment);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  if (submitted) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <View style={{ padding: Sizes.spacing.lg, alignItems: 'center', marginTop: 40 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
            Thank You!
          </Text>
          <Text
            style={{
              color: Colors.light.mutedForeground,
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            Your feedback has been submitted successfully. We appreciate your time
            and look forward to serving you again!
          </Text>
          <View
            style={{
              backgroundColor: '#f5f5f5',
              borderRadius: 8,
              padding: 16,
              width: '100%',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontWeight: '600', marginBottom: 8 }}>Your Rating</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={24}
                  color={star <= rating ? Colors.light.primary : Colors.light.mutedForeground}
                  fill={star <= rating ? Colors.light.primary : 'transparent'}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      contentContainerStyle={{ padding: Sizes.spacing.lg }}
    >
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
        Rate Your Experience
      </Text>
      <Text
        style={{
          color: Colors.light.mutedForeground,
          marginBottom: 24,
          fontSize: 14,
        }}
      >
        Order #{orderId}
      </Text>

      {/* Rating Stars */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontWeight: '600', marginBottom: 12 }}>How was your meal?</Text>
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              onLongPress={() => setHoveredRating(star)}
              onPressOut={() => setHoveredRating(0)}
            >
              <Star
                size={40}
                color={
                  star <= (hoveredRating || rating)
                    ? Colors.light.primary
                    : Colors.light.mutedForeground
                }
                fill={
                  star <= (hoveredRating || rating)
                    ? Colors.light.primary
                    : 'transparent'
                }
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Comment */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>
          Additional Comments
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: Colors.light.border,
            borderRadius: 8,
            padding: 12,
            minHeight: 100,
            textAlignVertical: 'top',
            color: Colors.light.foreground,
          }}
          placeholder="Tell us what you think..."
          placeholderTextColor={Colors.light.mutedForeground}
          value={comment}
          onChangeText={setComment}
          multiline
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={{
          backgroundColor:
            rating > 0 ? Colors.light.primary : Colors.light.mutedForeground,
          borderRadius: 8,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
        onPress={handleSubmit}
        disabled={rating === 0}
      >
        <Send size={20} color="#000" />
        <Text style={{ color: '#000', fontWeight: '600', fontSize: 16 }}>
          Submit Feedback
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
