import { useRouter } from 'expo-router';
import { ChevronDown, LogOut, Eye, EyeOff, Download } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { ScrollView, Text, TouchableOpacity, View, Alert, TextInput, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { authAPI, logsAPI } from '../../services/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    profile: false,
    logs: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [downloadingLogs, setDownloadingLogs] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Prevent back navigation
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout Confirmation',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call logout - it will handle clearing local state even if API fails
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              // Continue with navigation even if logout API fails
            } finally {
              // Always navigate to login, regardless of logout API success/failure
              router.replace('/auth/login' as any);
            }
          }
        }
      ]
    );
  };

  const handleUpdateProfile = async () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    // Validate password requirements if updating password
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        Alert.alert('Error', 'Current password is required to change password');
        return;
      }
      if (formData.newPassword.length < 6) {
        Alert.alert('Error', 'New password must be at least 6 characters');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
    }

    try {
      setLoading(true);
      const updatePayload: any = {
        name: formData.name,
        email: formData.email
      };

      if (formData.newPassword) {
        updatePayload.currentPassword = formData.currentPassword;
        updatePayload.newPassword = formData.newPassword;
      }

      const response = await authAPI.updateProfile(updatePayload);

      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleDownloadLogs = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }

    try {
      setDownloadingLogs(true);
      
      // Fetch logs for the date range
      const logsResponse = await logsAPI.getAll({ limit: 10000, offset: 0 });
      let allLogs = [];
      
      if (logsResponse.data?.logs && Array.isArray(logsResponse.data.logs)) {
        allLogs = logsResponse.data.logs;
      } else if (Array.isArray(logsResponse.data)) {
        allLogs = logsResponse.data;
      }

      // Filter logs by date range
      const filteredLogs = allLogs.filter((log: any) => {
        const logDate = new Date(log.createdAt).toISOString().split('T')[0];
        return logDate >= startDate && logDate <= endDate;
      });

      if (filteredLogs.length === 0) {
        Alert.alert('No Logs', 'No activity logs found for the selected date range');
        return;
      }

      // Generate PDF with logs
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #ffce1b; text-align: center; }
              h2 { color: #333; border-bottom: 2px solid #ffce1b; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #ffce1b; color: #000; padding: 10px; text-align: left; font-weight: bold; }
              td { padding: 8px; border-bottom: 1px solid #ddd; }
              tr:hover { background-color: #f5f5f5; }
              .info { margin: 10px 0; color: #666; }
            </style>
          </head>
          <body>
            <h1>JAPZ POS - Activity Logs Report</h1>
            <div class="info">
              <p><strong>Date Range:</strong> ${startDate} to ${endDate}</p>
              <p><strong>Total Records:</strong> ${filteredLogs.length}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <h2>Activity Log Details</h2>
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${filteredLogs.map((log: any) => `
                  <tr>
                    <td>${new Date(log.createdAt).toLocaleString()}</td>
                    <td>${log.userName || 'System'}</td>
                    <td><strong>${log.action.replace(/_/g, ' ')}</strong></td>
                    <td>${log.description || '-'}</td>
                    <td><strong>${log.status || 'N/A'}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const pdf = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      await Sharing.shareAsync(pdf.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Activity Logs (${startDate} to ${endDate})`
      });

      setShowDatePicker(false);
      Alert.alert('Success', 'Logs downloaded successfully');
    } catch (error) {
      console.error('Error downloading logs:', error);
      Alert.alert('Error', 'Failed to download logs');
    } finally {
      setDownloadingLogs(false);
    }
  };

  return (
    <View style={{ flex: 1, marginTop: Sizes.spacing.lg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.md }}>
          <Text style={{ fontSize: Sizes.typography['2xl'], fontWeight: '700', color: '#ffce1b' }}>
            Settings
          </Text>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              padding: Sizes.spacing.sm,
              borderRadius: Sizes.radius.sm,
              backgroundColor: Colors.light.muted,
            }}
          >
            <LogOut size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Admin Profile Section */}
        <TouchableOpacity
          style={{
            backgroundColor: Colors.light.card,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            marginBottom: Sizes.spacing.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          onPress={() => toggleSection('profile')}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
              Admin Profile
            </Text>
            <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground }}>
              View and edit your account information
            </Text>
          </View>
          <ChevronDown
            size={20}
            color={Colors.light.primary}
            style={{ transform: [{ rotate: expandedSections.profile ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {expandedSections.profile && (
          <View style={{
            borderWidth: 1,
            borderColor: Colors.light.border,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            marginBottom: Sizes.spacing.lg,
            gap: Sizes.spacing.md,
          }}>
            {/* Name Field */}
            <View>
              <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.xs }}>
                Name
              </Text>
              <TextInput
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                editable={isEditing}
                style={{
                  backgroundColor: isEditing ? '#fff' : Colors.light.muted,
                  borderRadius: Sizes.radius.sm,
                  padding: Sizes.spacing.md,
                  color: Colors.light.foreground,
                  fontWeight: '500',
                  borderWidth: isEditing ? 1 : 0,
                  borderColor: isEditing ? Colors.light.primary : 'transparent'
                }}
              />
            </View>

            {/* Email Field */}
            <View>
              <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.xs }}>
                Email
              </Text>
              <TextInput
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                editable={isEditing}
                keyboardType="email-address"
                style={{
                  backgroundColor: isEditing ? '#fff' : Colors.light.muted,
                  borderRadius: Sizes.radius.sm,
                  padding: Sizes.spacing.md,
                  color: Colors.light.foreground,
                  fontWeight: '500',
                  borderWidth: isEditing ? 1 : 0,
                  borderColor: isEditing ? Colors.light.primary : 'transparent'
                }}
              />
            </View>

            {/* Role Field (Read-only) */}
            <View>
              <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.xs }}>
                Role
              </Text>
              <TextInput
                value={user?.role?.toUpperCase() || 'ADMIN'}
                editable={false}
                style={{
                  backgroundColor: Colors.light.muted,
                  borderRadius: Sizes.radius.sm,
                  padding: Sizes.spacing.md,
                  color: Colors.light.foreground,
                  fontWeight: '500'
                }}
              />
            </View>

            {/* Current Password Field (Only when editing) */}
            {isEditing && (
              <View>
                <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.xs }}>
                  Current Password
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: Colors.light.primary,
                  borderRadius: Sizes.radius.sm,
                  backgroundColor: '#fff',
                  paddingRight: Sizes.spacing.md
                }}>
                  <TextInput
                    value={formData.currentPassword}
                    onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
                    placeholder="Enter current password"
                    secureTextEntry={!showPassword}
                    style={{
                      flex: 1,
                      padding: Sizes.spacing.md,
                      color: Colors.light.foreground,
                      fontWeight: '500'
                    }}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <Eye size={18} color={Colors.light.primary} />
                    ) : (
                      <EyeOff size={18} color={Colors.light.mutedForeground} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* New Password Field (Only when editing) */}
            {isEditing && (
              <View>
                <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.xs }}>
                  New Password (Optional)
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: Colors.light.primary,
                  borderRadius: Sizes.radius.sm,
                  backgroundColor: '#fff',
                  paddingRight: Sizes.spacing.md
                }}>
                  <TextInput
                    value={formData.newPassword}
                    onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                    placeholder="Enter new password"
                    secureTextEntry={!showNewPassword}
                    style={{
                      flex: 1,
                      padding: Sizes.spacing.md,
                      color: Colors.light.foreground,
                      fontWeight: '500'
                    }}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? (
                      <Eye size={18} color={Colors.light.primary} />
                    ) : (
                      <EyeOff size={18} color={Colors.light.mutedForeground} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Confirm Password Field (Only when editing) */}
            {isEditing && formData.newPassword && (
              <View>
                <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.xs }}>
                  Confirm New Password
                </Text>
                <TextInput
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                  placeholder="Confirm new password"
                  secureTextEntry
                  style={{
                    borderWidth: 1,
                    borderColor: formData.newPassword === formData.confirmPassword && formData.confirmPassword ? '#10B981' : Colors.light.primary,
                    borderRadius: Sizes.radius.sm,
                    backgroundColor: '#fff',
                    padding: Sizes.spacing.md,
                    color: Colors.light.foreground,
                    fontWeight: '500'
                  }}
                />
                {formData.newPassword !== formData.confirmPassword && (
                  <Text style={{ fontSize: Sizes.typography.xs, color: '#EF4444', marginTop: 4 }}>
                    Passwords do not match
                  </Text>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: Sizes.spacing.md, marginTop: Sizes.spacing.md }}>
              {!isEditing ? (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  style={{
                    flex: 1,
                    backgroundColor: '#FFCE1B',
                    borderRadius: Sizes.radius.sm,
                    padding: Sizes.spacing.md,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#030213', fontWeight: '600', fontSize: Sizes.typography.base }}>
                    Edit Profile
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={handleUpdateProfile}
                    disabled={loading}
                    style={{
                      flex: 1,
                      backgroundColor: loading ? Colors.light.muted : '#10B981',
                      borderRadius: Sizes.radius.sm,
                      padding: Sizes.spacing.md,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{ color: loading ? Colors.light.mutedForeground : '#fff', fontWeight: '600', fontSize: Sizes.typography.base }}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCancel}
                    disabled={loading}
                    style={{
                      flex: 1,
                      backgroundColor: Colors.light.muted,
                      borderRadius: Sizes.radius.sm,
                      padding: Sizes.spacing.md,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{ color: Colors.light.foreground, fontWeight: '600', fontSize: Sizes.typography.base }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* Download Logs Section - Placeholder for now */}
        <TouchableOpacity
          style={{
            backgroundColor: Colors.light.card,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            marginBottom: Sizes.spacing.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          onPress={() => toggleSection('logs')}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
              Download Logs
            </Text>
            <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground }}>
              Export activity logs for a date range
            </Text>
          </View>
          <ChevronDown
            size={20}
            color={Colors.light.primary}
            style={{ transform: [{ rotate: expandedSections.logs ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {expandedSections.logs && (
          <View style={{
            borderWidth: 1,
            borderColor: Colors.light.border,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            marginBottom: Sizes.spacing.lg,
            gap: Sizes.spacing.md,
          }}>
            <View>
              <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.xs }}>
                Start Date
              </Text>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                style={{
                  backgroundColor: '#fff',
                  borderRadius: Sizes.radius.sm,
                  padding: Sizes.spacing.md,
                  color: Colors.light.foreground,
                  fontWeight: '500',
                  borderWidth: 1,
                  borderColor: Colors.light.border
                }}
              />
            </View>

            <View>
              <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.xs }}>
                End Date
              </Text>
              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                style={{
                  backgroundColor: '#fff',
                  borderRadius: Sizes.radius.sm,
                  padding: Sizes.spacing.md,
                  color: Colors.light.foreground,
                  fontWeight: '500',
                  borderWidth: 1,
                  borderColor: Colors.light.border
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleDownloadLogs}
              disabled={downloadingLogs}
              style={{
                backgroundColor: downloadingLogs ? Colors.light.muted : '#FFCE1B',
                borderRadius: Sizes.radius.sm,
                padding: Sizes.spacing.md,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: Sizes.spacing.sm
              }}
            >
              <Download size={18} color={downloadingLogs ? Colors.light.mutedForeground : '#030213'} />
              <Text style={{ color: downloadingLogs ? Colors.light.mutedForeground : '#030213', fontWeight: '600', fontSize: Sizes.typography.base }}>
                {downloadingLogs ? 'Generating...' : 'Download Logs as PDF'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
