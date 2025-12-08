// app/cashier/pos.tsx
import { useRouter } from 'expo-router';
import { Minus, Plus, ShoppingCart, ChevronLeft } from 'lucide-react-native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchEmojis } from 'emojibase';
import { menuCategoryAPI, menuItemAPI } from '../../services/api';
import { Sizes, Colors } from '../../constants/colors';
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
  hasSize?: boolean;
  sizes?: Array<{ name: string; price: number }>;
  hasFlavor?: boolean;
  flavors?: string[];
}

interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
  selectedFlavor?: string;
  itemPrice: number;
}

// Helper function to get category icon using emojibase library
const getCategoryIcon = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  
  // Map category names to emoji characters
  const categoryMap: { [key: string]: string } = {
    'main': '🍽️',
    'course': '🍽️',
    'beverage': '🍹',
    'drink': '🧃',
    'coffee': '☕',
    'cooler': '🍧',
    'appetizer': '🥟',
    'snack': '🍘',
    'fries': '🍟',
    'dessert': '🍰',
    'sweet': '🍪',
    'salad': '🥗',
    'soup': '🍲',
    'pizza': '🍕',
    'burger': '🍔',
    'sandwich': '🥪',
    'pasta': '🍝',
    'rice': '🍚',
    'noodle': '🍜',
    'chicken': '🍗',
    'fish': '🍣',
    'seafood': '🦞',
    'beef': '🥩',
    'meat': '🍖',
    'vegetable': '🥦',
    'fruit': '🍎',
  };
  
  // Find matching category and return emoji
  for (const [key, emojiChar] of Object.entries(categoryMap)) {
    if (name.includes(key)) {
      return emojiChar;
    }
  }
  
  return '🍽️'; // Default fallback
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
  
  // State for size/flavor selection modal
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedFlavor, setSelectedFlavor] = useState<string>('');

  // Fetch categories and menu items on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Reload cart from AsyncStorage whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadCart = async () => {
        try {
          const savedCart = await AsyncStorage.getItem('cashierCart');
          if (savedCart) {
            const parsedCart = JSON.parse(savedCart);
            setCart(parsedCart);
          } else {
            // Cart was cleared, set to empty and close cart view
            setCart([]);
            setShowCart(false);
          }
        } catch (e) {
          console.warn('Failed to load cart from storage', e);
        }
      };
      
      loadCart();
    }, [])
  );

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
      
      // Ensure prices are numbers and parse sizes
      const formattedItems = itemsData.map((item: any) => {
        // Parse sizes from "SizeName - ₱Price" format to objects
        const parsedSizes: Array<{ name: string; price: number }> = [];
        
        if (item.sizes && Array.isArray(item.sizes)) {
          item.sizes.forEach((sizeString: any) => {
            if (typeof sizeString === 'string') {
              const match = sizeString.match(/(.+?)\s*-\s*₱([\d.]+)/);
              if (match) {
                parsedSizes.push({ name: match[1].trim(), price: Number(match[2]) });
              } else {
                // If format doesn't match, just use the string as name with 0 price
                parsedSizes.push({ name: sizeString, price: 0 });
              }
            } else if (typeof sizeString === 'object' && sizeString.name && sizeString.price) {
              // Already in object format
              parsedSizes.push({ name: sizeString.name, price: Number(sizeString.price) });
            }
          });
        }

        return {
          id: item.id,
          name: item.name,
          price: Number(item.price || 0),
          categoryId: item.categoryId || item.MenuCategoryId || item.category_id,
          hasSize: item.hasSize || false,
          sizes: parsedSizes,
          hasFlavor: item.hasFlavor || false,
          flavors: item.flavors || [],
        };
      });
      
      setProducts(formattedItems);

      // Load saved cart from AsyncStorage
      const savedCart = await AsyncStorage.getItem('cashierCart');
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          setCart(parsedCart);
        } catch (e) {
          console.warn('Failed to parse saved cart', e);
        }
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  // Save cart to AsyncStorage whenever it changes
  useEffect(() => {
    const saveCart = async () => {
      try {
        await AsyncStorage.setItem('cashierCart', JSON.stringify(cart));
      } catch (e) {
        console.warn('Failed to save cart', e);
      }
    };
    saveCart();
  }, [cart]);

  const filteredProducts = selectedCategory
    ? products.filter(p => p.categoryId === selectedCategory)
    : products;

  const addToCart = (product: Product) => {
    // If product has sizes or flavors, show options modal
    if (product.hasSize || product.hasFlavor) {
      setSelectedProductForOptions(product);
      setSelectedSize('');
      setSelectedFlavor('');
      setShowOptionsModal(true);
      return;
    }

    // Otherwise add directly
    setCart(prev => {
      const itemPrice = product.price;
      const existingIndex = prev.findIndex(item => item.id === product.id && !item.selectedSize && !item.selectedFlavor);
      
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      
      return [...prev, { ...product, quantity: 1, itemPrice }];
    });
  };

  const addSelectedOptionsToCart = () => {
    if (!selectedProductForOptions) return;
    
    const product = selectedProductForOptions;
    const sizePrice = selectedSize && product.sizes
      ? (product.sizes.find((s: any) => s.name === selectedSize)?.price || product.price)
      : product.price;
    const itemPrice = sizePrice;

    setCart(prev => {
      const existingIndex = prev.findIndex(item =>
        item.id === product.id &&
        item.selectedSize === selectedSize &&
        item.selectedFlavor === selectedFlavor
      );

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }

      return [...prev, {
        ...product,
        quantity: 1,
        selectedSize: selectedSize || undefined,
        selectedFlavor: selectedFlavor || undefined,
        itemPrice,
      }];
    });

    // Close modal
    setShowOptionsModal(false);
    setSelectedSize('');
    setSelectedFlavor('');
    setSelectedProductForOptions(null);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
    } else {
      setCart(prev => {
        const updated = [...prev];
        updated[index].quantity = quantity;
        return updated;
      });
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.itemPrice || item.price) * item.quantity, 0);

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
              {/* Back Button */}
              <TouchableOpacity
                style={{ marginBottom: Sizes.spacing.lg }}
                onPress={() => setShowCart(false)}
              >
                <ChevronLeft size={28} color="#030213" />
              </TouchableOpacity>
              {cart.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20, color: '#717182', fontSize: Sizes.typography.base }}>
                  Your cart is empty
                </Text>
              ) : (
                <>
                  {cart.map((item, index) => (
                    <View key={`${item.id}-${item.selectedSize}-${item.selectedFlavor}-${index}`} style={cashierStyles.cartItem}>
                      <View style={cashierStyles.cartItemInfo}>
                        <Text style={cashierStyles.cartItemName}>{item.name}</Text>
                        {item.selectedSize && <Text style={{ fontSize: 12, color: '#717182' }}>Size: {item.selectedSize}</Text>}
                        {item.selectedFlavor && <Text style={{ fontSize: 12, color: '#717182' }}>Flavor: {item.selectedFlavor}</Text>}
                        <Text style={cashierStyles.cartItemPrice}>₱{Number(item.itemPrice || item.price || 0).toFixed(2)}</Text>
                      </View>
                      <View style={cashierStyles.quantityControl}>
                        <TouchableOpacity onPress={() => updateQuantity(index, item.quantity - 1)}>
                          <Minus size={18} color="#030213" />
                        </TouchableOpacity>
                        <Text style={{ marginHorizontal: 8, fontWeight: '600', color: '#030213' }}>{item.quantity}</Text>
                        <TouchableOpacity onPress={() => updateQuantity(index, item.quantity + 1)}>
                          <Plus size={18} color="#030213" />
                        </TouchableOpacity>
                      </View>
                      <Text style={cashierStyles.cartItemTotal}>₱{(Number(item.itemPrice || item.price || 0) * item.quantity).toFixed(2)}</Text>
                      <TouchableOpacity
                        style={cashierStyles.removeButton}
                        onPress={() => removeFromCart(index)}
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
          <View style={{ flex: 1 }}>
            {/* Categories - Fixed at top with consistent width */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: Colors.light.border }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: scaled(Sizes.spacing.sm), paddingVertical: scaled(Sizes.spacing.md) }}
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
            </View>

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
                  <FlatList
                    data={filteredProducts}
                    numColumns={2}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{
                      paddingBottom: scaled(Sizes.spacing.md),
                      paddingHorizontal: scaled(Sizes.spacing.md),
                      paddingTop: scaled(Sizes.spacing.md),
                    }}
                    columnWrapperStyle={{
                      gap: scaled(Sizes.spacing.md),
                      justifyContent: 'flex-start',
                    }}
                    renderItem={({ item }) => (
                      <View style={cashierStyles.productCard}>
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
                    )}
                    scrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                  />
                );
              })()
            )}
          </View>
        )}
      </View>

      {/* Size & Flavor Options Modal */}
      {showOptionsModal && selectedProductForOptions && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: scaled(12),
            padding: scaled(Sizes.spacing.lg),
            width: '85%',
            maxHeight: '80%',
          }}>
            <Text style={{ fontSize: scaled(18), fontWeight: '700', marginBottom: scaled(Sizes.spacing.md) }}>
              {selectedProductForOptions.name}
            </Text>

            {/* Size Selection */}
            {selectedProductForOptions.hasSize && selectedProductForOptions.sizes && selectedProductForOptions.sizes.length > 0 && (
              <View style={{ marginBottom: scaled(Sizes.spacing.lg) }}>
                <Text style={{ fontSize: scaled(14), fontWeight: '600', marginBottom: scaled(Sizes.spacing.sm) }}>
                  Select Size:
                </Text>
                <View style={{ gap: scaled(Sizes.spacing.sm) }}>
                  {selectedProductForOptions.sizes.map((size: any, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={{
                        backgroundColor: selectedSize === size.name ? Colors.brand.primary : Colors.light.card,
                        borderRadius: scaled(Sizes.radius.md),
                        padding: scaled(Sizes.spacing.md),
                        borderWidth: 2,
                        borderColor: selectedSize === size.name ? Colors.brand.primary : Colors.light.border,
                      }}
                      onPress={() => setSelectedSize(size.name)}
                    >
                      <Text style={{
                        color: selectedSize === size.name ? '#fff' : Colors.light.foreground,
                        fontWeight: '600',
                      }}>
                        {size.name} - ₱{Number(size.price || 0).toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Flavor Selection */}
            {selectedProductForOptions.hasFlavor && selectedProductForOptions.flavors && selectedProductForOptions.flavors.length > 0 && (
              <View style={{ marginBottom: scaled(Sizes.spacing.lg) }}>
                <Text style={{ fontSize: scaled(14), fontWeight: '600', marginBottom: scaled(Sizes.spacing.sm) }}>
                  Select Flavor:
                </Text>
                <View style={{ gap: scaled(Sizes.spacing.sm) }}>
                  {selectedProductForOptions.flavors.map((flavor: string, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={{
                        backgroundColor: selectedFlavor === flavor ? Colors.brand.primary : Colors.light.card,
                        borderRadius: scaled(Sizes.radius.md),
                        padding: scaled(Sizes.spacing.md),
                        borderWidth: 2,
                        borderColor: selectedFlavor === flavor ? Colors.brand.primary : Colors.light.border,
                      }}
                      onPress={() => setSelectedFlavor(flavor)}
                    >
                      <Text style={{
                        color: selectedFlavor === flavor ? '#fff' : Colors.light.foreground,
                        fontWeight: '600',
                      }}>
                        {flavor}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: scaled(Sizes.spacing.md), marginTop: scaled(Sizes.spacing.lg) }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: Colors.light.border,
                  borderRadius: scaled(Sizes.radius.md),
                  padding: scaled(Sizes.spacing.md),
                  alignItems: 'center',
                }}
                onPress={() => {
                  setShowOptionsModal(false);
                  setSelectedProductForOptions(null);
                  setSelectedSize('');
                  setSelectedFlavor('');
                }}
              >
                <Text style={{ color: Colors.light.foreground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: Colors.brand.primary,
                  borderRadius: scaled(Sizes.radius.md),
                  padding: scaled(Sizes.spacing.md),
                  alignItems: 'center',
                }}
                onPress={addSelectedOptionsToCart}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}