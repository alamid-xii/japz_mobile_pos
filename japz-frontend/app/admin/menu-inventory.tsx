import { Cake, ChevronDown, ChevronRight, Droplets, Leaf, Plus, UtensilsCrossed } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, Modal, Alert } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';

interface Category {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  icon: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  status: 'available' | 'unavailable';
}

const mockCategories: Category[] = [
  { id: '1', name: 'Main Dishes', description: 'Lunch and dinner main courses', itemCount: 12, icon: 'dish' },
  { id: '2', name: 'Appetizers', description: 'Starters and side dishes', itemCount: 8, icon: 'leaf' },
  { id: '3', name: 'Beverages', description: 'Drinks and smoothies', itemCount: 15, icon: 'droplets' },
  { id: '4', name: 'Desserts', description: 'Sweet treats and pastries', itemCount: 10, icon: 'cake' },
];

const mockItems: MenuItem[] = [
  { id: '1', name: 'Chicken Adobo', category: 'Main Dishes', price: 250, status: 'available' },
  { id: '2', name: 'Beef Sinigang', category: 'Main Dishes', price: 280, status: 'available' },
  { id: '3', name: 'Iced Tea', category: 'Beverages', price: 75, status: 'unavailable' },
  { id: '4', name: 'Turon', category: 'Desserts', price: 50, status: 'available' },
];

const statusColors = {
  available: '#10B981',
  unavailable: '#EF4444',
};

const getCategoryIcon = (iconName: string) => {
  const iconProps = { size: 28, color: Colors.light.primary };
  switch (iconName) {
    case 'dish': return <UtensilsCrossed {...iconProps} />;
    case 'leaf': return <Leaf {...iconProps} />;
    case 'droplets': return <Droplets {...iconProps} />;
    case 'cake': return <Cake {...iconProps} />;
    default: return null;
  }
};

export default function MenuInventoryScreen() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [items, setItems] = useState<MenuItem[]>(mockItems);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'menu' | 'categories'>('menu');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showMenuItemModal, setShowMenuItemModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newCatName, setNewCatName] = useState('');

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpandCategory = (id: string) => {
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const toggleExpandItem = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const deleteCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  return (
    <View style={{ flex: 1, marginTop: Sizes.spacing.lg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
      >
        <Text style={{ fontSize: Sizes.typography.xl, fontWeight: '700', marginBottom: Sizes.spacing.lg }}>
          Menu & Categories
        </Text>

        {/* Tab Navigation */}
        <View style={{ flexDirection: 'row', gap: Sizes.spacing.md, marginBottom: Sizes.spacing.lg }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: Sizes.spacing.md,
              borderRadius: Sizes.radius.md,
              alignItems: 'center',
              backgroundColor: activeTab === 'menu' ? '#FFCE1B' : Colors.light.card,
              borderWidth: 1,
              borderColor: activeTab === 'menu' ? '#FFCE1B' : Colors.light.border,
            }}
            onPress={() => setActiveTab('menu')}
          >
            <Text style={{ fontWeight: '700', color: activeTab === 'menu' ? '#030213' : Colors.light.foreground }}>
              Menu
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: Sizes.spacing.md,
              borderRadius: Sizes.radius.md,
              alignItems: 'center',
              backgroundColor: activeTab === 'categories' ? '#FFCE1B' : Colors.light.card,
              borderWidth: 1,
              borderColor: activeTab === 'categories' ? '#FFCE1B' : Colors.light.border,
            }}
            onPress={() => setActiveTab('categories')}
          >
            <Text style={{ fontWeight: '700', color: activeTab === 'categories' ? '#030213' : Colors.light.foreground }}>
              Categories
            </Text>
          </TouchableOpacity>
        </View>

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <>
            {/* Search */}
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: Colors.light.border,
                borderRadius: Sizes.radius.md,
                padding: Sizes.spacing.md,
                color: Colors.light.foreground,
                marginBottom: Sizes.spacing.lg,
                fontSize: Sizes.typography.base,
              }}
              placeholder="Search menu items..."
              placeholderTextColor={Colors.light.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
            {/* Category Dropdown */}
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: Colors.light.border,
                borderRadius: Sizes.radius.md,
                paddingHorizontal: Sizes.spacing.md,
                paddingVertical: Sizes.spacing.md,
                backgroundColor: Colors.light.card,
                marginBottom: Sizes.spacing.lg,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Text style={{ fontSize: Sizes.typography.base, color: Colors.light.foreground, fontWeight: '600' }}>
                {selectedCategory === 'all' ? 'All Categories' : categories.find(c => c.id === selectedCategory)?.name}
              </Text>
              <ChevronDown
                size={20}
                color={Colors.light.primary}
                style={{ transform: [{ rotate: showCategoryDropdown ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            {showCategoryDropdown && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: Colors.light.border,
                  borderRadius: Sizes.radius.md,
                  marginBottom: Sizes.spacing.lg,
                  backgroundColor: Colors.light.card,
                  overflow: 'hidden',
                }}
              >
                <TouchableOpacity
                  style={{
                    paddingHorizontal: Sizes.spacing.md,
                    paddingVertical: Sizes.spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.light.border,
                    backgroundColor: selectedCategory === 'all' ? '#F0F0F0' : 'transparent',
                  }}
                  onPress={() => {
                    setSelectedCategory('all');
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={{ fontSize: Sizes.typography.base, fontWeight: selectedCategory === 'all' ? '700' : '400', color: Colors.light.foreground }}>
                    All Categories
                  </Text>
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={{
                      paddingHorizontal: Sizes.spacing.md,
                      paddingVertical: Sizes.spacing.md,
                      borderBottomWidth: category.id !== categories[categories.length - 1].id ? 1 : 0,
                      borderBottomColor: Colors.light.border,
                      backgroundColor: selectedCategory === category.id ? '#F0F0F0' : 'transparent',
                    }}
                    onPress={() => {
                      setSelectedCategory(category.id);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text style={{ fontSize: Sizes.typography.base, fontWeight: selectedCategory === category.id ? '700' : '400', color: Colors.light.foreground }}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Items List */}
            {filteredItems.map((item) => (
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
                onPress={() => toggleExpandItem(item.id)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
                      {item.name}
                    </Text>
                    <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
                      {item.category}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: statusColors[item.status],
                      paddingHorizontal: Sizes.spacing.sm,
                      paddingVertical: 4,
                      borderRadius: Sizes.radius.sm,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: Sizes.typography.xs, textTransform: 'capitalize' }}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', color: Colors.light.primary }}>
                  ₱{item.price.toFixed(2)}
                </Text>

                {expandedItem === item.id && (
                  <View style={{ marginTop: Sizes.spacing.md, paddingTop: Sizes.spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border }}>
                    <Text style={{ color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm, fontSize: Sizes.typography.sm }}>
                      Item Status
                    </Text>
                    <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm }}>
                      {(['available', 'unavailable'] as const).map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={{
                            flex: 1,
                            paddingVertical: Sizes.spacing.sm,
                            backgroundColor: item.status === status ? statusColors[status] : Colors.light.muted,
                            borderRadius: Sizes.radius.sm,
                            alignItems: 'center',
                          }}
                          onPress={() => setItems(
                            items.map(i => i.id === item.id ? { ...i, status } : i)
                          )}
                        >
                          <Text style={{ color: item.status === status ? '#fff' : Colors.light.mutedForeground, fontWeight: '600', fontSize: Sizes.typography.sm, textTransform: 'capitalize' }}>
                            {status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <>
            

            {/* Categories List */}
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.md }}>
              Existing Categories
            </Text>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={{
                  backgroundColor: Colors.light.card,
                  borderRadius: Sizes.radius.md,
                  padding: Sizes.spacing.md,
                  marginBottom: Sizes.spacing.md,
                  borderLeftWidth: 4,
                  borderLeftColor: Colors.light.primary,
                }}
                onPress={() => toggleExpandCategory(category.id)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Sizes.spacing.md, flex: 1 }}>
                    {getCategoryIcon(category.icon)}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
                        {category.name}
                      </Text>
                      <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
                        {category.itemCount} items
                      </Text>
                    </View>
                  </View>
                  {expandedCategory === category.id ? <ChevronDown size={18} color={Colors.light.primary} /> : <ChevronRight size={18} color={Colors.light.primary} />}
                </View>

                <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
                  {category.description}
                </Text>

                {expandedCategory === category.id && (
                  <View style={{ marginTop: Sizes.spacing.md, paddingTop: Sizes.spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border, gap: Sizes.spacing.sm }}>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#FFCE1B',
                        paddingVertical: Sizes.spacing.sm,
                        borderRadius: Sizes.radius.sm,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#030213', fontWeight: '600' }}>
                        Edit Category
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#FEE2E2',
                        paddingVertical: Sizes.spacing.sm,
                        borderRadius: Sizes.radius.sm,
                        alignItems: 'center',
                      }}
                      onPress={() => deleteCategory(category.id)}
                    >
                      <Text style={{ color: '#991B1B', fontWeight: '600' }}>
                        Delete Category
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: Sizes.spacing.md + 1,
          right: Sizes.spacing.lg,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#FFCE1B',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3,
          elevation: 5,
        }}
        onPress={() => {
          if (activeTab === 'menu') {
            setShowMenuItemModal(true);
          } else {
            setShowAddCategoryModal(true);
          }
        }}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Menu Item Modal */}
      <Modal
        visible={showMenuItemModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenuItemModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: Colors.light.background,
              borderTopLeftRadius: Sizes.radius.lg,
              borderTopRightRadius: Sizes.radius.lg,
              padding: Sizes.spacing.lg,
              maxHeight: '80%',
            }}
          >
            <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', marginBottom: Sizes.spacing.lg }}>
              Add New Menu Item
            </Text>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: Colors.light.border,
                borderRadius: Sizes.radius.md,
                paddingHorizontal: Sizes.spacing.md,
                paddingVertical: Sizes.spacing.sm,
                marginBottom: Sizes.spacing.md,
                fontSize: Sizes.typography.base,
                color: Colors.light.foreground,
              }}
              placeholder="Item name..."
              placeholderTextColor={Colors.light.mutedForeground}
              value={newItemName}
              onChangeText={setNewItemName}
            />

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: Colors.light.border,
                borderRadius: Sizes.radius.md,
                paddingHorizontal: Sizes.spacing.md,
                paddingVertical: Sizes.spacing.sm,
                marginBottom: Sizes.spacing.md,
                fontSize: Sizes.typography.base,
                color: Colors.light.foreground,
              }}
              placeholder="Price..."
              placeholderTextColor={Colors.light.mutedForeground}
              keyboardType="decimal-pad"
              value={newItemPrice}
              onChangeText={setNewItemPrice}
            />

            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: Colors.light.border,
                borderRadius: Sizes.radius.md,
                paddingHorizontal: Sizes.spacing.md,
                paddingVertical: Sizes.spacing.md,
                marginBottom: Sizes.spacing.md,
                backgroundColor: Colors.light.card,
              }}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Text style={{ fontSize: Sizes.typography.base, color: Colors.light.foreground }}>
                {newItemCategory ? categories.find(c => c.id === newItemCategory)?.name : 'Select category...'}
              </Text>
            </TouchableOpacity>

            {showCategoryDropdown && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: Colors.light.border,
                  borderRadius: Sizes.radius.md,
                  marginBottom: Sizes.spacing.md,
                  backgroundColor: Colors.light.card,
                  overflow: 'hidden',
                }}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={{
                      paddingHorizontal: Sizes.spacing.md,
                      paddingVertical: Sizes.spacing.md,
                      borderBottomWidth: cat.id !== categories[categories.length - 1].id ? 1 : 0,
                      borderBottomColor: Colors.light.border,
                    }}
                    onPress={() => {
                      setNewItemCategory(cat.id);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text style={{ fontSize: Sizes.typography.base, color: Colors.light.foreground }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={{
                backgroundColor: '#FFCE1B',
                paddingVertical: Sizes.spacing.md,
                borderRadius: Sizes.radius.md,
                alignItems: 'center',
                marginBottom: Sizes.spacing.md,
              }}
              onPress={() => {
                if (!newItemName || !newItemPrice || !newItemCategory) {
                  Alert.alert('Validation Error', 'Please fill in all fields');
                  return;
                }
                Alert.alert('Success', `${newItemName} has been added`);
                setNewItemName('');
                setNewItemPrice('');
                setNewItemCategory('');
                setShowMenuItemModal(false);
              }}
            >
              <Text style={{ color: '#030213', fontWeight: '600', fontSize: Sizes.typography.base }}>
                Create Item
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: Sizes.spacing.md,
                borderRadius: Sizes.radius.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: Colors.light.border,
              }}
              onPress={() => setShowMenuItemModal(false)}
            >
              <Text style={{ color: Colors.light.foreground, fontWeight: '600', fontSize: Sizes.typography.base }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        visible={showAddCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddCategoryModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: Colors.light.background,
              borderTopLeftRadius: Sizes.radius.lg,
              borderTopRightRadius: Sizes.radius.lg,
              padding: Sizes.spacing.lg,
              maxHeight: '80%',
            }}
          >
            <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', marginBottom: Sizes.spacing.lg }}>
              Add New Category
            </Text>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: Colors.light.border,
                borderRadius: Sizes.radius.md,
                paddingHorizontal: Sizes.spacing.md,
                paddingVertical: Sizes.spacing.sm,
                marginBottom: Sizes.spacing.lg,
                fontSize: Sizes.typography.base,
                color: Colors.light.foreground,
              }}
              placeholder="Category name..."
              placeholderTextColor={Colors.light.mutedForeground}
              value={newCatName}
              onChangeText={setNewCatName}
            />

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: Colors.light.border,
                borderRadius: Sizes.radius.md,
                paddingHorizontal: Sizes.spacing.md,
                paddingVertical: Sizes.spacing.sm,
                marginBottom: Sizes.spacing.lg,
                fontSize: Sizes.typography.base,
                color: Colors.light.foreground,
                minHeight: 60,
              }}
              placeholder="Category description..."
              placeholderTextColor={Colors.light.mutedForeground}
              value={newCategoryDesc}
              onChangeText={setNewCategoryDesc}
              multiline
            />

            <TouchableOpacity
              style={{
                backgroundColor: '#FFCE1B',
                paddingVertical: Sizes.spacing.md,
                borderRadius: Sizes.radius.md,
                alignItems: 'center',
                marginBottom: Sizes.spacing.md,
              }}
              onPress={() => {
                if (!newCatName) {
                  Alert.alert('Validation Error', 'Please enter a category name');
                  return;
                }
                Alert.alert('Success', `${newCatName} has been added`);
                setNewCatName('');
                setShowAddCategoryModal(false);
              }}
            >
              <Text style={{ color: '#030213', fontWeight: '600', fontSize: Sizes.typography.base }}>
                Create Category
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: Sizes.spacing.md,
                borderRadius: Sizes.radius.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: Colors.light.border,
              }}
              onPress={() => setShowAddCategoryModal(false)}
            >
              <Text style={{ color: Colors.light.foreground, fontWeight: '600', fontSize: Sizes.typography.base }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}