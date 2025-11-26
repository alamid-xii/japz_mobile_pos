// app/cashier/pos.tsx
import { useRouter } from 'expo-router';
import { Minus, Plus, ShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import {
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CashierBottomNav } from '../../components/shared/CashierBottomNav';
import { Colors, Sizes } from '../../constants/colors';
import { cashierStyles } from '../../styles/cashierStyles';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function POSScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const categories = ['all', 'Burgers', 'Pasta', 'Sides', 'Beverages'];

  const products: Product[] = [
    { id: '1', name: 'Classic Burger', price: 5.99, category: 'Burgers' },
    { id: '2', name: 'Cheese Burger', price: 6.99, category: 'Burgers' },
    { id: '3', name: 'French Fries', price: 2.99, category: 'Sides' },
    { id: '4', name: 'Carbonara Pasta', price: 8.99, category: 'Pasta' },
    { id: '5', name: 'Iced Coffee', price: 3.99, category: 'Beverages' },
  ];

  const filteredProducts = products.filter(
    p => selectedCategory === 'all' || p.category === selectedCategory
  );

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

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
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

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
        {/* Header */}
        <View style={cashierStyles.header}>
          <Text style={cashierStyles.title}>POS System</Text>
          <TouchableOpacity
            onPress={() => setShowCart(!showCart)}
            style={cashierStyles.cartButton}
          >
            <ShoppingCart size={24} color={Colors.light.foreground} />
            {cart.length > 0 && (
              <View style={cashierStyles.cartBadge}>
                <Text style={cashierStyles.cartBadgeText}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {showCart ? (
          // Cart View
          <ScrollView style={{ flex: 1, padding: Sizes.spacing.md }}>
            {cart.length === 0 ? (
              <Text style={{ textAlign: 'center', marginTop: 20, color: Colors.light.mutedForeground }}>
                Your cart is empty
              </Text>
            ) : (
              <>
                {cart.map(item => (
                  <View key={item.id} style={cashierStyles.cartItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={cashierStyles.cartItemName}>{item.name}</Text>
                      <Text style={cashierStyles.cartItemPrice}>${item.price.toFixed(2)}</Text>
                    </View>
                    <View style={cashierStyles.quantityControl}>
                      <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Minus size={20} color={Colors.light.foreground} />
                      </TouchableOpacity>
                      <Text style={{ marginHorizontal: 8, fontWeight: '600' }}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Plus size={20} color={Colors.light.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <View style={cashierStyles.cartTotal}>
                  <Text style={cashierStyles.cartTotalLabel}>Total:</Text>
                  <Text style={cashierStyles.cartTotalAmount}>${cartTotal.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={cashierStyles.checkoutButton}
                  onPress={() => router.push('/cashier/payment-selection')}
                >
                  <Text style={cashierStyles.checkoutButtonText}>Proceed to Checkout</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        ) : (
          // Products View
          <>
            {/* Categories */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ paddingVertical: Sizes.spacing.md }}
              contentContainerStyle={{ paddingHorizontal: Sizes.spacing.md }}
            >
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    cashierStyles.categoryButton,
                    selectedCategory === cat && cashierStyles.categoryButtonActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      cashierStyles.categoryButtonText,
                      selectedCategory === cat && cashierStyles.categoryButtonTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Products Grid */}
            <FlatList
              data={filteredProducts}
              numColumns={2}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={cashierStyles.productCard}>
                  <View style={cashierStyles.productImage}>
                    <Text style={{ fontSize: 40, textAlign: 'center' }}>🍔</Text>
                  </View>
                  <Text style={cashierStyles.productName}>{item.name}</Text>
                  <Text style={cashierStyles.productPrice}>${item.price.toFixed(2)}</Text>
                  <TouchableOpacity
                    style={cashierStyles.addToCartButton}
                    onPress={() => addToCart(item)}
                  >
                    <Plus size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={{ paddingHorizontal: Sizes.spacing.md }}
            />
          </>
        )}
      </View>
      <CashierBottomNav currentScreen="pos" />
    </View>
  );
}