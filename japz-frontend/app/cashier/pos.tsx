// app/cashier/pos.tsx
import { useRouter } from 'expo-router';
import { Minus, Plus, ShoppingCart } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { CashierBottomNav } from '../../components/shared/CashierBottomNav';
import { menuCategoryAPI, menuItemAPI } from '../../services/api';
import { Sizes } from '../../constants/colors';
import { cashierStyles } from '../../styles/cashierStyles';
import { scaled } from '../../utils/responsive';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  categoryId: number;
}

interface CartItem extends Product {
  quantity: number;
}

// Helper function to get category icon
const getCategoryIcon = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  if (name.includes('main') || name.includes('course')) return '🍽️';
  if (name.includes('beverage') || name.includes('drink')) return '🥤';
  if (name.includes('appetizer') || name.includes('snack')) return '🍟';
  if (name.includes('dessert') || name.includes('sweet')) return '🍰';
  if (name.includes('salad')) return '🥗';
  if (name.includes('soup')) return '🍲';
  if (name.includes('pizza')) return '🍕';
  if (name.includes('burger') || name.includes('sandwich')) return '🍔';
  if (name.includes('pasta')) return '🍝';
  if (name.includes('rice') || name.includes('noodle')) return '🍜';
  if (name.includes('chicken')) return '🍗';
  if (name.includes('fish') || name.includes('seafood')) return '🐟';
  if (name.includes('beef') || name.includes('meat')) return '🥩';
  return '🍽️'; // Default
};

export default function POSScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories and menu items on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Prevent back navigation
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories
      const categoriesRes = await menuCategoryAPI.getAll();
      const categoriesData = categoriesRes.data?.data || categoriesRes.data || [];
      setCategories(categoriesData);

      // Set first category as default
      if (categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0].id);
      }

      // Fetch menu items
      const itemsRes = await menuItemAPI.getAll();
      const itemsData = itemsRes.data?.data || itemsRes.data || [];
      
      // Ensure prices are numbers
      const formattedItems = itemsData.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price || 0),
        categoryId: item.categoryId || item.MenuCategoryId || item.category_id,
      }));
      
      setProducts(formattedItems);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.categoryId === selectedCategory)
    : products;

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(prev =>
        prev.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F8F8' }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={cashierStyles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Sizes.spacing.sm }}>
            <Image
              source={require('../../assets/images/logo.jpg')}
              style={{ width: scaled(36), height: scaled(36), borderRadius: scaled(8) }}
            />
            <Text style={cashierStyles.title}>JAPZ MobilePOS</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCart(!showCart)}
            style={cashierStyles.cartButton}
          >
            <ShoppingCart size={24} color="#030213" />
            {cart.length > 0 && (
              <View style={cashierStyles.cartBadge}>
                <Text style={cashierStyles.cartBadgeText}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {showCart ? (
          // Cart View
          <ScrollView style={{ flex: 1, backgroundColor: '#F8F8F8' }}>
            <View style={{ padding: Sizes.spacing.lg }}>
              {cart.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20, color: '#717182', fontSize: Sizes.typography.base }}>
                  Your cart is empty
                </Text>
              ) : (
                <>
                  {cart.map(item => (
                    <View key={item.id} style={cashierStyles.cartItem}>
                      <View style={cashierStyles.cartItemInfo}>
                        <Text style={cashierStyles.cartItemName}>{item.name}</Text>
                        <Text style={cashierStyles.cartItemPrice}>₱{Number(item.price || 0).toFixed(2)}</Text>
                      </View>
                      <View style={cashierStyles.quantityControl}>
                        <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus size={18} color="#030213" />
                        </TouchableOpacity>
                        <Text style={{ marginHorizontal: 8, fontWeight: '600', color: '#030213' }}>{item.quantity}</Text>
                        <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus size={18} color="#030213" />
                        </TouchableOpacity>
                      </View>
                      <Text style={cashierStyles.cartItemTotal}>₱{(Number(item.price || 0) * item.quantity).toFixed(2)}</Text>
                      <TouchableOpacity
                        style={cashierStyles.removeButton}
                        onPress={() => removeFromCart(item.id)}
                      >
                        <Text style={cashierStyles.removeButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={cashierStyles.cartTotal}>
                    <Text style={cashierStyles.cartTotalLabel}>Total:</Text>
                    <Text style={cashierStyles.cartTotalAmount}>₱{cartTotal.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity
                    style={cashierStyles.checkoutButton}
                    onPress={() => {
                      router.push({
                        pathname: '/cashier/payment-selection',
                        params: {
                          total: cartTotal.toFixed(2),
                          items: JSON.stringify(cart),
                          itemCount: cart.length,
                        },
                      });
                    }}
                  >
                    <Text style={cashierStyles.checkoutButtonText}>Proceed to Checkout</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        ) : loading ? (
          // Loading State
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F7C948" />
            <Text style={{ marginTop: 12, color: '#717182' }}>Loading menu...</Text>
          </View>
        ) : error ? (
          // Error State
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Sizes.spacing.lg }}>
            <Text style={{ fontSize: Sizes.typography.base, color: '#d4183d', textAlign: 'center', marginBottom: Sizes.spacing.md }}>
              {error}
            </Text>
            <TouchableOpacity
              style={cashierStyles.checkoutButton}
              onPress={fetchData}
            >
              <Text style={cashierStyles.checkoutButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Products View
          <>
            {/* Categories */}
            <ScrollView
              horizontal
              contentContainerStyle={{ paddingHorizontal: scaled(Sizes.spacing.sm), marginTop: scaled(Sizes.spacing.sm), marginBottom: scaled(Sizes.spacing.lg) }}
            >
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    cashierStyles.categoryButton,
                    selectedCategory === cat.id && cashierStyles.categoryButtonActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      cashierStyles.categoryButtonText,
                      selectedCategory === cat.id && cashierStyles.categoryButtonTextActive,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Products Grid (2-column flow) */}
            {filteredProducts.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#717182', fontSize: Sizes.typography.base }}>No items in this category</Text>
              </View>
            ) : (
              (() => {
                const currentCategory = categories.find(c => c.id === selectedCategory);
                const categoryIcon = getCategoryIcon(currentCategory?.name || 'Unknown');
                return (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                      paddingBottom: scaled(Sizes.spacing.md),
                      paddingHorizontal: scaled(Sizes.spacing.md),
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-start',
                    }}
                  >
                    {filteredProducts.map((item) => (
                      <View key={item.id} style={cashierStyles.productCard}>
                        <View style={cashierStyles.productImage}>
                          <Text style={{ fontSize: scaled(48), textAlign: 'center' }}>{categoryIcon}</Text>
                        </View>
                        <View style={cashierStyles.productBody}>
                          <Text style={cashierStyles.productName} numberOfLines={2}>{item.name}</Text>
                          <Text style={cashierStyles.productPrice}>₱{Number(item.price || 0).toFixed(2)}</Text>
                        </View>
                        <View style={cashierStyles.productFooter}>
                          <TouchableOpacity
                            style={cashierStyles.addToCartButton}
                            onPress={() => addToCart(item)}
                          >
                            <Plus size={scaled(20)} color="#030213" />
                            <Text style={cashierStyles.addToCartButtonText}>Add</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                );
              })()
            )}
          </>
        )}
      </View>
      <CashierBottomNav currentScreen="pos" />
    </View>
  );
}