import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { ScrollView, Text, View, Image, FlatList, ActivityIndicator, RefreshControl, Dimensions, Modal, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Colors, Sizes } from '../../constants/colors';
import { menuItemAPI, menuCategoryAPI } from '../../services/api';
import { X, Maximize2 } from 'lucide-react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

const { width, height } = Dimensions.get('window');

interface MenuItem {
  id: number;
  name: string;
  price: number;
  description?: string;
  status: 'available' | 'unavailable';
  categoryId: number;
  hasSize?: boolean;
  sizes?: Array<{ name: string; price: number }>;
  hasFlavor?: boolean;
  flavors?: string[];
}

interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
}

export default function MenuboardScreen() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const navigation = useNavigation();

  // Update screen options when fullscreen mode changes
  useLayoutEffect(() => {
    if (fullscreenMode) {
      navigation.setOptions({
        tabBarStyle: { display: 'none' },
      } as any);
    } else {
      navigation.setOptions({
        tabBarStyle: {
          backgroundColor: Colors.light.card,
          borderTopWidth: 1,
          borderTopColor: Colors.light.border,
          paddingTop: 5,
        },
      } as any);
    }
  }, [fullscreenMode, navigation]);

  // Auto-refresh every 5 seconds to get real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMenuData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMenuData();
    }, [])
  );

  const handleFullscreenEnter = async () => {
    setFullscreenMode(true);
    await ScreenOrientation.unlockAsync();
  };

  const handleFullscreenExit = async () => {
    setFullscreenMode(false);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
  };

  const fetchMenuData = async () => {
    try {
      // Fetch categories
      const categoriesResponse = await menuCategoryAPI.getAll();
      const categoriesData = categoriesResponse.data || [];
      setCategories(categoriesData);

      // Fetch all menu items
      const itemsResponse = await menuItemAPI.getAll();
      const itemsData = itemsResponse.data || [];
      
      // Parse sizes and flavors
      const formattedItems = itemsData.map((item: any) => {
        const parsedSizes: Array<{ name: string; price: number }> = [];
        
        if (item.sizes && Array.isArray(item.sizes)) {
          item.sizes.forEach((sizeString: any) => {
            if (typeof sizeString === 'string') {
              const match = sizeString.match(/(.+?)\s*-\s*₱([\d.]+)/);
              if (match) {
                parsedSizes.push({ name: match[1].trim(), price: Number(match[2]) });
              } else {
                parsedSizes.push({ name: sizeString, price: 0 });
              }
            } else if (typeof sizeString === 'object' && sizeString.name && sizeString.price) {
              parsedSizes.push({ name: sizeString.name, price: Number(sizeString.price) });
            }
          });
        }

        return {
          ...item,
          sizes: parsedSizes,
        };
      });
      
      setMenuItems(formattedItems);
    } catch (error) {
      console.error('Error fetching menu data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Group items by category
  const groupedByCategory = categories.map((cat) => ({
    category: cat,
    items: menuItems.filter((item) => item.categoryId === cat.id),
  }));

  const getAddOns = () => {
    const addOnCategory = categories.find((c) => c.name.toLowerCase().includes('add'));
    return menuItems.filter((item) => item.categoryId === addOnCategory?.id);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator size="large" color="#ffce1b" />
        <Text style={{ marginTop: Sizes.spacing.md, color: '#999' }}>
          Loading menu...
        </Text>
      </View>
    );
  }

  // Fullscreen Modal - Compact single-page layout like reference image (16:9 aspect ratio)
  if (fullscreenMode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 5 }}>
        {/* Close Button - Top Right Corner */}
        <TouchableOpacity
          onPress={handleFullscreenExit}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: '#ffce1b',
            borderRadius: 50,
            padding: 10,
            zIndex: 100,
          }}
        >
          <X size={20} color="#000" />
        </TouchableOpacity>

        {/* Content Container - 16:9 centered */}
        <View style={{ width: '90%', aspectRatio: 16 / 9, backgroundColor: '#000', flexDirection: 'row', padding: 16, gap: 16 }}>
          {/* Column 1 */}
          <View style={{ flex: 1, paddingRight: 8 }}>
            {groupedByCategory.slice(0, Math.ceil(groupedByCategory.length / 3)).map((group) => (
              group.items.length > 0 && (
                <View key={group.category.id} style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffce1b', marginBottom: 5, textTransform: 'uppercase' }}>
                    {group.category.name}
                  </Text>
                  <View style={{ gap: 3 }}>
                    {group.items.map((item) => (
                      <View
                        key={item.id}
                        style={{
                          opacity: item.status === 'unavailable' ? 0.4 : 1,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, fontWeight: '600', color: '#fff', flex: 1 }} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#ffce1b', marginLeft: 6 }}>
                            {(typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')).toFixed(0)}
                          </Text>
                        </View>
                        {item.status === 'unavailable' && (
                          <Text style={{ fontSize: 7, color: '#ef4444', fontWeight: '700' }}>
                            UNAVAILABLE
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )
            ))}
          </View>

          {/* Column 2 */}
          <View style={{ flex: 1, paddingHorizontal: 4 }}>
            {groupedByCategory.slice(Math.ceil(groupedByCategory.length / 3), Math.ceil(groupedByCategory.length * 2 / 3)).map((group) => (
              group.items.length > 0 && (
                <View key={group.category.id} style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffce1b', marginBottom: 5, textTransform: 'uppercase' }}>
                    {group.category.name}
                  </Text>
                  <View style={{ gap: 3 }}>
                    {group.items.map((item) => (
                      <View
                        key={item.id}
                        style={{
                          opacity: item.status === 'unavailable' ? 0.4 : 1,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, fontWeight: '600', color: '#fff', flex: 1 }} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#ffce1b', marginLeft: 6 }}>
                            {(typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')).toFixed(0)}
                          </Text>
                        </View>
                        {item.status === 'unavailable' && (
                          <Text style={{ fontSize: 7, color: '#ef4444', fontWeight: '700' }}>
                            UNAVAILABLE
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )
            ))}
          </View>

          {/* Column 3 */}
          <View style={{ flex: 1, paddingLeft: 8 }}>
            {groupedByCategory.slice(Math.ceil(groupedByCategory.length * 2 / 3)).map((group) => (
              group.items.length > 0 && (
                <View key={group.category.id} style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffce1b', marginBottom: 5, textTransform: 'uppercase' }}>
                    {group.category.name}
                  </Text>
                  <View style={{ gap: 3 }}>
                    {group.items.map((item) => (
                      <View
                        key={item.id}
                        style={{
                          opacity: item.status === 'unavailable' ? 0.4 : 1,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, fontWeight: '600', color: '#fff', flex: 1 }} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#ffce1b', marginLeft: 6 }}>
                            {(typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')).toFixed(0)}
                          </Text>
                        </View>
                        {item.status === 'unavailable' && (
                          <Text style={{ fontSize: 7, color: '#ef4444', fontWeight: '700' }}>
                            UNAVAILABLE
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )
            ))}

            {/* Add-ons Footer */}
            {getAddOns().length > 0 && (
              <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#ffce1b', paddingTop: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#ffce1b', marginBottom: 5 }}>
                  ADD-ONS:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {getAddOns().slice(0, 6).map((item) => (
                    <View
                      key={item.id}
                      style={{
                        backgroundColor: '#ffce1b',
                        paddingHorizontal: 5,
                        paddingVertical: 2,
                        borderRadius: 3,
                        opacity: item.status === 'unavailable' ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 7, fontWeight: '700', color: '#000' }}>
                        {item.name.substring(0, 13)} ₱{(typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')).toFixed(0)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#000', paddingVertical: Sizes.spacing.lg, paddingHorizontal: Sizes.spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 48, fontWeight: '900', color: '#ffce1b', textAlign: 'center' }}>
            JAPZ GRILL
          </Text>
          <Text style={{ fontSize: 18, color: '#ffce1b', textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>
            NOT YOUR ORDINARY BURGER. 100% PURE BEEF!
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleFullscreenEnter}
          style={{
            backgroundColor: '#ffce1b',
            borderRadius: 50,
            padding: Sizes.spacing.md,
            marginLeft: Sizes.spacing.md,
          }}
        >
          <Maximize2 size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Menu Content - Scrollable Multi-Column */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchMenuData();
            }}
            tintColor="#ffce1b"
          />
        }
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
      >
        {/* Render all categories and items */}
        {groupedByCategory.map((group) => (
          group.items.length > 0 && (
            <View key={group.category.id} style={{ marginBottom: Sizes.spacing.xl }}>
              {/* Category Header */}
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#ffce1b', marginBottom: Sizes.spacing.md, textTransform: 'uppercase' }}>
                {group.category.name}
              </Text>

              {/* Items List */}
              <View style={{ gap: Sizes.spacing.md }}>
                {group.items.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      opacity: item.status === 'unavailable' ? 0.4 : 1,
                      paddingBottom: Sizes.spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: '#333',
                    }}
                  >
                    {/* Item Name and Price Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Sizes.spacing.sm }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', flex: 1, marginRight: Sizes.spacing.md }} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffce1b', minWidth: 50, textAlign: 'right' }}>
                        ₱{(typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')).toFixed(0)}
                      </Text>
                    </View>

                    {/* Sizes Row */}
                    {item.hasSize && item.sizes && item.sizes.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.xs }}>
                        {item.sizes.map((size: any, idx: number) => (
                          <Text key={idx} style={{ fontSize: 12, color: '#ccc', fontWeight: '500' }}>
                            {size.name.toUpperCase()}{' '}
                            <Text style={{ color: '#ffce1b', fontWeight: '700' }}>₱{size.price}</Text>
                            {idx < item.sizes.length - 1 && <Text style={{ color: '#666' }}> | </Text>}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Flavors Row */}
                    {item.hasFlavor && item.flavors && item.flavors.length > 0 && (
                      <Text style={{ fontSize: 12, color: '#ccc', marginBottom: Sizes.spacing.xs }}>
                        {item.flavors.join(', ').toUpperCase()}
                      </Text>
                    )}

                    {/* Unavailable Badge */}
                    {item.status === 'unavailable' && (
                      <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700', marginTop: Sizes.spacing.xs }}>
                        UNAVAILABLE
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )
        ))}

        {/* Add-ons Footer */}
        {getAddOns().length > 0 && (
          <View style={{ marginTop: Sizes.spacing.xl, borderTopWidth: 2, borderTopColor: '#ffce1b', paddingTop: Sizes.spacing.lg }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#ffce1b', marginBottom: Sizes.spacing.md }}>
              ADD-ONS:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Sizes.spacing.md }}>
              {getAddOns().map((item) => (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: '#ffce1b',
                    paddingHorizontal: Sizes.spacing.md,
                    paddingVertical: Sizes.spacing.sm,
                    borderRadius: Sizes.radius.sm,
                    opacity: item.status === 'unavailable' ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>
                    {item.name.toUpperCase()} - ₱{(typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')).toFixed(0)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
