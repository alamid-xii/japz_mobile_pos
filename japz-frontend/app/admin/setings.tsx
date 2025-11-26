import { useRouter } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';

interface Setting {
  id: string;
  label: string;
  description: string;
  value: boolean;
  type: 'toggle';
}

interface Station {
  id: string;
  name: string;
  type: 'kitchen' | 'cashier' | 'admin';
  ip: string;
  status: 'online' | 'offline';
}

const mockSettings: Setting[] = [
  { id: '1', label: 'Enable Notifications', description: 'Send order and user notifications', value: true, type: 'toggle' },
  { id: '2', label: 'Automatic Backups', description: 'Daily backup of system data', value: true, type: 'toggle' },
  { id: '3', label: 'Maintenance Mode', description: 'Disable customer access temporarily', value: false, type: 'toggle' },
  { id: '4', label: 'Email Alerts', description: 'Send alerts via email', value: true, type: 'toggle' },
];

const mockStations: Station[] = [
  { id: '1', name: 'Kitchen Display 1', type: 'kitchen', ip: '192.168.1.100', status: 'online' },
  { id: '2', name: 'Cashier Terminal 1', type: 'cashier', ip: '192.168.1.101', status: 'online' },
  { id: '3', name: 'Cashier Terminal 2', type: 'cashier', ip: '192.168.1.102', status: 'offline' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [settings, setSettings] = useState(mockSettings);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    configuration: false,
    stations: false,
    maintenance: false,
  });

  const toggleSetting = (id: string) => {
    setSettings(settings.map(s =>
      s.id === id ? { ...s, value: !s.value } : s
    ));
  };

  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login' as any);
  };

  return (
    <View style={{ flex: 1, marginTop: Sizes.spacing.lg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg, paddingBottom: Sizes.spacing.xl }}
      >
        <Text style={{ fontSize: Sizes.typography.xl, fontWeight: '700', marginBottom: Sizes.spacing.lg }}>
          System Settings
        </Text>

        {/* Configuration Section */}
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
          onPress={() => toggleSection('configuration')}
        >
          <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
            Configuration
          </Text>
          <ChevronDown
            size={20}
            color={Colors.light.primary}
            style={{ transform: [{ rotate: expandedSections.configuration ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {expandedSections.configuration && (
          <View style={{
            borderWidth: 1,
            borderColor: Colors.light.border,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            marginBottom: Sizes.spacing.lg,
            gap: Sizes.spacing.md,
          }}>
            {settings.map((setting) => (
              <View
                key={setting.id}
                style={{
                  backgroundColor: Colors.light.card,
                  borderRadius: Sizes.radius.md,
                  padding: Sizes.spacing.md,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderLeftWidth: 2,
                  borderLeftColor: Colors.light.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: Sizes.typography.base, fontWeight: '600', marginBottom: Sizes.spacing.sm }}>
                    {setting.label}
                  </Text>
                  <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
                    {setting.description}
                  </Text>
                </View>
                <Switch
                  value={setting.value}
                  onValueChange={() => toggleSetting(setting.id)}
                  trackColor={{ false: Colors.light.muted, true: Colors.light.primary }}
                  thumbColor={setting.value ? '#fff' : Colors.light.border}
                />
              </View>
            ))}
          </View>
        )}

        {/* Manage Stations Section */}
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
          onPress={() => toggleSection('stations')}
        >
          <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
            Manage Stations
          </Text>
          <ChevronDown
            size={20}
            color={Colors.light.primary}
            style={{ transform: [{ rotate: expandedSections.stations ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {expandedSections.stations && (
          <View style={{
            borderWidth: 1,
            borderColor: Colors.light.border,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            marginBottom: Sizes.spacing.lg,
            gap: Sizes.spacing.md,
          }}>
            {mockStations.map((station) => (
              <TouchableOpacity
                key={station.id}
                style={{
                  backgroundColor: Colors.light.card,
                  borderRadius: Sizes.radius.md,
                  padding: Sizes.spacing.md,
                  borderLeftWidth: 4,
                  borderLeftColor: station.status === 'online' ? '#10B981' : Colors.light.muted,
                }}
                onPress={() => toggleExpand(station.id)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
                      {station.name}
                    </Text>
                    <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
                      {station.ip}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: Sizes.spacing.sm,
                      paddingVertical: 4,
                      borderRadius: Sizes.radius.sm,
                      backgroundColor: station.status === 'online' ? '#DCFCE7' : Colors.light.muted,
                    }}
                  >
                    <Text
                      style={{
                        color: station.status === 'online' ? '#15803D' : Colors.light.mutedForeground,
                        fontSize: Sizes.typography.xs,
                        fontWeight: '600',
                        textTransform: 'capitalize',
                      }}
                    >
                      {station.status}
                    </Text>
                  </View>
                </View>

                {expanded === station.id && (
                  <View style={{ marginTop: Sizes.spacing.md, paddingTop: Sizes.spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border, gap: Sizes.spacing.sm }}>
                    <View>
                      <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs, marginBottom: 4 }}>
                        Type
                      </Text>
                      <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                        {station.type}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#FFCE1B',
                        paddingVertical: Sizes.spacing.sm,
                        borderRadius: Sizes.radius.sm,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#030213', fontWeight: '600', fontSize: Sizes.typography.sm }}>
                        Configure
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Maintenance Section */}
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
          onPress={() => toggleSection('maintenance')}
        >
          <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
            Maintenance
          </Text>
          <ChevronDown
            size={20}
            color={Colors.light.primary}
            style={{ transform: [{ rotate: expandedSections.maintenance ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {expandedSections.maintenance && (
          <View style={{
            borderWidth: 1,
            borderColor: Colors.light.border,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            marginBottom: Sizes.spacing.lg,
            gap: Sizes.spacing.md,
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: Colors.light.card,
                borderRadius: Sizes.radius.md,
                padding: Sizes.spacing.md,
                alignItems: 'center',
              }}
              onPress={() => router.push('/admin/activities-log')}
            >
              <Text style={{ color: Colors.light.foreground, fontWeight: '600' }}>
                Activities Log
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: Colors.light.card,
                borderRadius: Sizes.radius.md,
                padding: Sizes.spacing.md,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: Colors.light.foreground, fontWeight: '600' }}>
                Backup System Data
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: Colors.light.card,
                borderRadius: Sizes.radius.md,
                padding: Sizes.spacing.md,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: Colors.light.foreground, fontWeight: '600' }}>
                Clear Cache
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: '#FEE2E2',
                borderRadius: Sizes.radius.md,
                padding: Sizes.spacing.md,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#991B1B', fontWeight: '600' }}>
                Reset System
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button - Always Visible Above Nav */}
        <TouchableOpacity
          style={{
            backgroundColor: '#DC2626',
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            alignItems: 'center',
            marginBottom: 80,
          }}
          onPress={handleLogout}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
