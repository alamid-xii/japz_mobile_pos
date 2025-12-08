import { Cake, ChevronDown, ChevronRight, Droplets, Leaf, Plus, UtensilsCrossed, X } from 'lucide-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, Modal, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect as useNavFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { menuCategoryAPI, menuItemAPI } from '../../services/api';
import { useFocusEffect } from 'expo-router';

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
  categoryId: number | string;
  price: number;
  status: 'available' | 'unavailable';
}

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
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
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');
  const [showEditMenuItemModal, setShowEditMenuItemModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<any | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemCategory, setEditItemCategory] = useState('');
  const [editItemDescription, setEditItemDescription] = useState('');
  const [editHasSize, setEditHasSize] = useState(false);
  const [editSizes, setEditSizes] = useState<string[]>([]);
  const [editSizeInput, setEditSizeInput] = useState('');
  const [editHasFlavor, setEditHasFlavor] = useState(false);
  const [editFlavors, setEditFlavors] = useState<string[]>([]);
  const [editFlavorInput, setEditFlavorInput] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [hasSize, setHasSize] = useState(false);
  const [sizeInput, setSizeInput] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);
  const [hasFlavor, setHasFlavor] = useState(false);
  const [flavorInput, setFlavorInput] = useState('');
  const [flavors, setFlavors] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prevent back navigation
  useNavFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  // Load data from backend
  useFocusEffect(
    React.useCallback(() => {
      loadCategories();
      loadMenuItems();
    }, [])
  );

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await menuCategoryAPI.getAll();
      const formattedCategories = response.data.map((cat: any) => ({
        id: cat.id.toString(),
        name: cat.name,
        description: cat.description || '',
        itemCount: cat.itemCount || 0,
        icon: cat.icon || 'dish',
      }));
      setCategories(formattedCategories);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async () => {
    try {
      const response = await menuItemAPI.getAll();
      const formattedItems = response.data.map((item: any) => ({
        id: item.id.toString(),
        name: item.name,
        category: item.category?.name || 'Unknown',
        categoryId: item.categoryId || item.MenuCategoryId || item.category?.id || 0,
        price: parseFloat(item.price),
        status: item.status,
      }));
      setItems(formattedItems);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to load menu items');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || (item.categoryId && item.categoryId.toString() === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const toggleExpandCategory = (id: string) => {
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const toggleExpandItem = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const deleteCategory = async (id: string, name: string) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await menuCategoryAPI.delete(id);
              Alert.alert('Success', 'Category deleted successfully');
              loadCategories();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete category');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryDesc(category.description);
    setShowEditCategoryModal(true);
  };

  const handleEditCategory = async () => {
    if (!editCategoryName) {
      Alert.alert('Validation Error', 'Category name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await menuCategoryAPI.update(editingCategory!.id, {
        name: editCategoryName,
        description: editCategoryDesc,
      });
      Alert.alert('Success', 'Category updated successfully');
      setEditCategoryName('');
      setEditCategoryDesc('');
      setEditingCategory(null);
      setShowEditCategoryModal(false);
      loadCategories();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName) {
      Alert.alert('Validation Error', 'Please enter a category name');
      return;
    }

    try {
      setIsSubmitting(true);
      await menuCategoryAPI.create({
        name: newCatName,
        description: newCategoryDesc,
        icon: 'dish'
      });
      Alert.alert('Success', `${newCatName} has been added`);
      setNewCatName('');
      setNewCategoryDesc('');
      setShowAddCategoryModal(false);
      loadCategories();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMenuItem = async () => {
    if (!newItemName || !newItemPrice || !newItemCategory) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await menuItemAPI.create({
        name: newItemName,
        categoryId: parseInt(newItemCategory),
        price: parseFloat(newItemPrice),
        hasSize: hasSize,
        sizes: hasSize ? sizes : undefined,
        hasFlavor: hasFlavor,
        flavors: hasFlavor ? flavors : undefined,
      });
      Alert.alert('Success', `${newItemName} has been added`);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemCategory('');
      setHasSize(false);
      setSizes([]);
      setSizeInput('');
      setHasFlavor(false);
      setFlavors([]);
      setFlavorInput('');
      setShowMenuItemModal(false);
      loadMenuItems();
      loadCategories(); // Reload to update item counts
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create menu item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItemStatus = async (itemId: string, status: 'available' | 'unavailable') => {
    try {
      await menuItemAPI.update(itemId, { status });
      setItems(items.map(i => i.id === itemId ? { ...i, status } : i));
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update item status');
    }
  };

  const openEditMenuItem = async (item: any) => {
    try {
      // Fetch full item details from API to get sizes and flavors
      const response = await menuItemAPI.getAll();
      const fullItem = response.data.find((i: any) => i.id.toString() === item.id);
      
      setEditingMenuItem(fullItem || item);
      setEditItemName(item.name);
      setEditItemPrice(item.price.toString());
      setEditItemCategory(item.categoryId?.toString() || '');
      setEditItemDescription(fullItem?.description || '');
      setEditHasSize(fullItem?.hasSize || false);
      setEditSizes(fullItem?.sizes || []);
      setEditHasFlavor(fullItem?.hasFlavor || false);
      setEditFlavors(fullItem?.flavors || []);
      setShowEditMenuItemModal(true);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load item details');
    }
  };

  const handleEditMenuItem = async () => {
    if (!editItemName || !editItemPrice || !editItemCategory) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await menuItemAPI.update(editingMenuItem.id, {
        name: editItemName,
        categoryId: parseInt(editItemCategory),
        price: parseFloat(editItemPrice),
        description: editItemDescription,
        hasSize: editHasSize,
        sizes: editHasSize ? editSizes : undefined,
        hasFlavor: editHasFlavor,
        flavors: editHasFlavor ? editFlavors : undefined,
      });
      Alert.alert('Success', 'Menu item updated successfully');
      setShowEditMenuItemModal(false);
      loadMenuItems();
      loadCategories();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update menu item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, marginTop: Sizes.spacing.lg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
      >
        <Text style={{ fontSize: Sizes.typography['2xl'], fontWeight: '700', marginBottom: Sizes.spacing.sm, color:'#ffce1b' }}>
          Menu & Categories
        </Text>

        {/* Tab Navigation */}
        <View style={{ flexDirection: 'row', gap: Sizes.spacing.md, marginBottom: Sizes.spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.light.border }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: Sizes.spacing.md,
              paddingBottom: Sizes.spacing.md - 2,
              alignItems: 'center',
              backgroundColor: 'transparent',
              borderBottomWidth: activeTab === 'menu' ? 3 : 0,
              borderBottomColor: activeTab === 'menu' ? '#FFCE1B' : 'transparent',
            }}
            onPress={() => setActiveTab('menu')}
          >
            <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', color: activeTab === 'menu' ? '#FFCE1B' : Colors.light.foreground }}>
              Menu
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: Sizes.spacing.md,
              paddingBottom: Sizes.spacing.md - 2,
              alignItems: 'center',
              backgroundColor: 'transparent',
              borderBottomWidth: activeTab === 'categories' ? 3 : 0,
              borderBottomColor: activeTab === 'categories' ? '#FFCE1B' : 'transparent',
            }}
            onPress={() => setActiveTab('categories')}
          >
            <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', color: activeTab === 'categories' ? '#FFCE1B' : Colors.light.foreground }}>
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
                    <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.md }}>
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
                          onPress={() => handleUpdateItemStatus(item.id, status)}
                        >
                          <Text style={{ color: item.status === status ? '#fff' : Colors.light.mutedForeground, fontWeight: '600', fontSize: Sizes.typography.sm, textTransform: 'capitalize' }}>
                            {status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#FFCE1B',
                        paddingVertical: Sizes.spacing.sm,
                        borderRadius: Sizes.radius.sm,
                        alignItems: 'center',
                      }}
                      onPress={() => openEditMenuItem(item)}
                    >
                      <Text style={{ color: '#030213', fontWeight: '600' }}>
                        Edit Menu Item
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <>
            {loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Sizes.spacing.xl }}>
                <ActivityIndicator size="large" color="#FFCE1B" />
                <Text style={{ marginTop: Sizes.spacing.md, color: Colors.light.mutedForeground }}>
                  Loading categories...
                </Text>
              </View>
            ) : categories.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Sizes.spacing.xl }}>
                <Text style={{ fontSize: Sizes.typography.base, color: Colors.light.mutedForeground, textAlign: 'center' }}>
                  No categories yet. Add one using the + button below.
                </Text>
              </View>
            ) : (
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
                      onPress={() => openEditCategory(category)}
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
                      onPress={() => deleteCategory(category.id, category.name)}
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
          boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.25)',
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

            {/* Size Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: Sizes.spacing.md,
                gap: Sizes.spacing.sm,
              }}
              onPress={() => setHasSize(!hasSize)}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: hasSize ? '#FFCE1B' : Colors.light.border,
                  backgroundColor: hasSize ? '#FFCE1B' : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {hasSize && <Text style={{ color: '#030213', fontWeight: '700' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: Sizes.typography.base, color: Colors.light.foreground, fontWeight: '600' }}>
                Add Size Options
              </Text>
            </TouchableOpacity>

            {hasSize && (
              <View style={{ marginBottom: Sizes.spacing.md }}>
                <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.sm }}>
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: Colors.light.border,
                      borderRadius: Sizes.radius.md,
                      paddingHorizontal: Sizes.spacing.md,
                      paddingVertical: Sizes.spacing.sm,
                      fontSize: Sizes.typography.base,
                      color: Colors.light.foreground,
                    }}
                    placeholder="Size (e.g., Small, Medium, Large)"
                    placeholderTextColor={Colors.light.mutedForeground}
                    value={sizeInput}
                    onChangeText={setSizeInput}
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#FFCE1B',
                      paddingHorizontal: Sizes.spacing.md,
                      paddingVertical: Sizes.spacing.sm,
                      borderRadius: Sizes.radius.md,
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      if (sizeInput.trim()) {
                        setSizes([...sizes, sizeInput.trim()]);
                        setSizeInput('');
                      }
                    }}
                  >
                    <Text style={{ color: '#030213', fontWeight: '600' }}>Add</Text>
                  </TouchableOpacity>
                </View>
                {sizes.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Sizes.spacing.xs }}>
                    {sizes.map((size, index) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#FFF8DC',
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderRadius: 12,
                          gap: 4,
                        }}
                      >
                        <Text style={{ fontSize: Sizes.typography.sm }}>{size}</Text>
                        <TouchableOpacity
                          onPress={() => setSizes(sizes.filter((_, i) => i !== index))}
                        >
                          <X size={14} color="#666" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Flavor Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: Sizes.spacing.md,
                gap: Sizes.spacing.sm,
              }}
              onPress={() => setHasFlavor(!hasFlavor)}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: hasFlavor ? '#FFCE1B' : Colors.light.border,
                  backgroundColor: hasFlavor ? '#FFCE1B' : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {hasFlavor && <Text style={{ color: '#030213', fontWeight: '700' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: Sizes.typography.base, color: Colors.light.foreground, fontWeight: '600' }}>
                Add Flavor Options
              </Text>
            </TouchableOpacity>

            {hasFlavor && (
              <View style={{ marginBottom: Sizes.spacing.md }}>
                <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.sm }}>
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: Colors.light.border,
                      borderRadius: Sizes.radius.md,
                      paddingHorizontal: Sizes.spacing.md,
                      paddingVertical: Sizes.spacing.sm,
                      fontSize: Sizes.typography.base,
                      color: Colors.light.foreground,
                    }}
                    placeholder="Flavor (e.g., Chocolate, Vanilla)"
                    placeholderTextColor={Colors.light.mutedForeground}
                    value={flavorInput}
                    onChangeText={setFlavorInput}
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#FFCE1B',
                      paddingHorizontal: Sizes.spacing.md,
                      paddingVertical: Sizes.spacing.sm,
                      borderRadius: Sizes.radius.md,
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      if (flavorInput.trim()) {
                        setFlavors([...flavors, flavorInput.trim()]);
                        setFlavorInput('');
                      }
                    }}
                  >
                    <Text style={{ color: '#030213', fontWeight: '600' }}>Add</Text>
                  </TouchableOpacity>
                </View>
                {flavors.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Sizes.spacing.xs }}>
                    {flavors.map((flavor, index) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#FFF8DC',
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderRadius: 12,
                          gap: 4,
                        }}
                      >
                        <Text style={{ fontSize: Sizes.typography.sm }}>{flavor}</Text>
                        <TouchableOpacity
                          onPress={() => setFlavors(flavors.filter((_, i) => i !== index))}
                        >
                          <X size={14} color="#666" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

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
              onPress={handleCreateMenuItem}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#030213" />
              ) : (
                <Text style={{ color: '#030213', fontWeight: '600', fontSize: Sizes.typography.base }}>
                  Create Item
                </Text>
              )}
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
                minHeight: 60,
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
                minHeight: 80,
              }}
              placeholder="Category description (optional)..."
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
              onPress={handleCreateCategory}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#030213" />
              ) : (
                <Text style={{ color: '#030213', fontWeight: '600', fontSize: Sizes.typography.base }}>
                  Create Category
                </Text>
              )}
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

      {/* Edit Category Modal */}
      <Modal
        visible={showEditCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditCategoryModal(false)}
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
              Edit Category
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
                minHeight: 60,
              }}
              placeholder="Category name..."
              placeholderTextColor={Colors.light.mutedForeground}
              value={editCategoryName}
              onChangeText={setEditCategoryName}
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
                minHeight: 80,
              }}
              placeholder="Category description (optional)..."
              placeholderTextColor={Colors.light.mutedForeground}
              value={editCategoryDesc}
              onChangeText={setEditCategoryDesc}
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
              onPress={handleEditCategory}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#030213" />
              ) : (
                <Text style={{ color: '#030213', fontWeight: '600', fontSize: Sizes.typography.base }}>
                  Update Category
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: Sizes.spacing.md,
                borderRadius: Sizes.radius.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: Colors.light.border,
              }}
              onPress={() => setShowEditCategoryModal(false)}
            >
              <Text style={{ color: Colors.light.foreground, fontWeight: '600', fontSize: Sizes.typography.base }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Menu Item Modal */}
      <Modal
        visible={showEditMenuItemModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditMenuItemModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
          <ScrollView
            style={{
              backgroundColor: Colors.light.background,
              borderTopLeftRadius: Sizes.radius.lg,
              borderTopRightRadius: Sizes.radius.lg,
              maxHeight: '90%',
            }}
            contentContainerStyle={{ padding: Sizes.spacing.lg }}
          >
            <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', marginBottom: Sizes.spacing.lg }}>
              Edit Menu Item
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
              value={editItemName}
              onChangeText={setEditItemName}
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
              value={editItemPrice}
              onChangeText={setEditItemPrice}
            />

            <View
              style={{
                borderWidth: 1,
                borderColor: Colors.light.border,
                borderRadius: Sizes.radius.md,
                paddingHorizontal: Sizes.spacing.md,
                paddingVertical: Sizes.spacing.md,
                marginBottom: Sizes.spacing.md,
                backgroundColor: Colors.light.card,
              }}
            >
              <Text style={{ fontSize: Sizes.typography.base, color: Colors.light.foreground }}>
                {editItemCategory ? categories.find(c => c.id === editItemCategory)?.name : 'Select category...'}
              </Text>
            </View>

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
                minHeight: 80,
              }}
              placeholder="Description (optional)..."
              placeholderTextColor={Colors.light.mutedForeground}
              value={editItemDescription}
              onChangeText={setEditItemDescription}
              multiline
            />

            {/* Size Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: Sizes.spacing.md,
                gap: Sizes.spacing.sm,
              }}
              onPress={() => setEditHasSize(!editHasSize)}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: editHasSize ? '#FFCE1B' : Colors.light.border,
                  backgroundColor: editHasSize ? '#FFCE1B' : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {editHasSize && <Text style={{ color: '#030213', fontWeight: '700' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: Sizes.typography.base, color: Colors.light.foreground, fontWeight: '600' }}>
                Add Size Options
              </Text>
            </TouchableOpacity>

            {editHasSize && (
              <View style={{ marginBottom: Sizes.spacing.md }}>
                <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.sm }}>
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: Colors.light.border,
                      borderRadius: Sizes.radius.md,
                      paddingHorizontal: Sizes.spacing.md,
                      paddingVertical: Sizes.spacing.sm,
                      fontSize: Sizes.typography.base,
                      color: Colors.light.foreground,
                    }}
                    placeholder="Size (e.g., Small, Medium, Large)"
                    placeholderTextColor={Colors.light.mutedForeground}
                    value={editSizeInput}
                    onChangeText={setEditSizeInput}
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#FFCE1B',
                      paddingHorizontal: Sizes.spacing.md,
                      paddingVertical: Sizes.spacing.sm,
                      borderRadius: Sizes.radius.md,
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      if (editSizeInput.trim()) {
                        setEditSizes([...editSizes, editSizeInput.trim()]);
                        setEditSizeInput('');
                      }
                    }}
                  >
                    <Text style={{ color: '#030213', fontWeight: '600' }}>Add</Text>
                  </TouchableOpacity>
                </View>
                {editSizes.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Sizes.spacing.xs }}>
                    {editSizes.map((size, index) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#FFF8DC',
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderRadius: 12,
                          gap: 4,
                        }}
                      >
                        <Text style={{ fontSize: Sizes.typography.sm }}>{size}</Text>
                        <TouchableOpacity
                          onPress={() => setEditSizes(editSizes.filter((_, i) => i !== index))}
                        >
                          <X size={14} color="#666" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Flavor Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: Sizes.spacing.md,
                gap: Sizes.spacing.sm,
              }}
              onPress={() => setEditHasFlavor(!editHasFlavor)}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: editHasFlavor ? '#FFCE1B' : Colors.light.border,
                  backgroundColor: editHasFlavor ? '#FFCE1B' : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {editHasFlavor && <Text style={{ color: '#030213', fontWeight: '700' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: Sizes.typography.base, color: Colors.light.foreground, fontWeight: '600' }}>
                Add Flavor Options
              </Text>
            </TouchableOpacity>

            {editHasFlavor && (
              <View style={{ marginBottom: Sizes.spacing.md }}>
                <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.sm }}>
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: Colors.light.border,
                      borderRadius: Sizes.radius.md,
                      paddingHorizontal: Sizes.spacing.md,
                      paddingVertical: Sizes.spacing.sm,
                      fontSize: Sizes.typography.base,
                      color: Colors.light.foreground,
                    }}
                    placeholder="Flavor (e.g., Chocolate, Vanilla)"
                    placeholderTextColor={Colors.light.mutedForeground}
                    value={editFlavorInput}
                    onChangeText={setEditFlavorInput}
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#FFCE1B',
                      paddingHorizontal: Sizes.spacing.md,
                      paddingVertical: Sizes.spacing.sm,
                      borderRadius: Sizes.radius.md,
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      if (editFlavorInput.trim()) {
                        setEditFlavors([...editFlavors, editFlavorInput.trim()]);
                        setEditFlavorInput('');
                      }
                    }}
                  >
                    <Text style={{ color: '#030213', fontWeight: '600' }}>Add</Text>
                  </TouchableOpacity>
                </View>
                {editFlavors.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Sizes.spacing.xs }}>
                    {editFlavors.map((flavor, index) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#FFF8DC',
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderRadius: 12,
                          gap: 4,
                        }}
                      >
                        <Text style={{ fontSize: Sizes.typography.sm }}>{flavor}</Text>
                        <TouchableOpacity
                          onPress={() => setEditFlavors(editFlavors.filter((_, i) => i !== index))}
                        >
                          <X size={14} color="#666" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
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
              onPress={handleEditMenuItem}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#030213" />
              ) : (
                <Text style={{ color: '#030213', fontWeight: '600', fontSize: Sizes.typography.base }}>
                  Update Menu Item
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: Sizes.spacing.md,
                borderRadius: Sizes.radius.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: Colors.light.border,
              }}
              onPress={() => setShowEditMenuItemModal(false)}
            >
              <Text style={{ color: Colors.light.foreground, fontWeight: '600', fontSize: Sizes.typography.base }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}