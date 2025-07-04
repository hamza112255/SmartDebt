import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tag, Plus, Edit, Trash2, ChevronRight, ArrowLeft, Save, X, MoreVertical } from 'lucide-react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { RFPercentage } from 'react-native-responsive-fontsize';
import { getAllObjects, realm } from '../realm';
import uuid from 'react-native-uuid';
import { supabase } from '../supabase';
import { useTranslation } from 'react-i18next';
import { useNetInfo } from '@react-native-community/netinfo';

const CATEGORY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

const DEFAULT_CATEGORIES = {
  income: [
    { name: 'Salary', description: 'Regular employment income', icon: '💼', type: 'income' },
    { name: 'Business', description: 'Business income', icon: '🏢', type: 'income' },
    { name: 'Investment', description: 'Investment returns', icon: '📈', type: 'income' },
    { name: 'Freelance', description: 'Freelance work income', icon: '💻', type: 'income' },
    { name: 'Other Income', description: 'Other sources of income', icon: '💰', type: 'income' },
  ],
  expense: [
    { name: 'Food & Dining', description: 'Restaurants, groceries, etc.', icon: '🍽️', type: 'expense' },
    { name: 'Transportation', description: 'Car, gas, public transport', icon: '🚗', type: 'expense' },
    { name: 'Shopping', description: 'Clothing, electronics, etc.', icon: '🛍️', type: 'expense' },
    { name: 'Entertainment', description: 'Movies, games, hobbies', icon: '🎬', type: 'expense' },
    { name: 'Bills & Utilities', description: 'Electricity, water, internet', icon: '📄', type: 'expense' },
    { name: 'Healthcare', description: 'Medical expenses', icon: '🏥', type: 'expense' },
    { name: 'Education', description: 'Books, courses, tuition', icon: '📚', type: 'expense' },
    { name: 'Travel', description: 'Vacation, business trips', icon: '✈️', type: 'expense' },
    { name: 'Home & Garden', description: 'Rent, maintenance, furniture', icon: '🏠', type: 'expense' },
    { name: 'Personal Care', description: 'Haircut, cosmetics, etc.', icon: '💄', type: 'expense' },
  ],
  debt: [
    { name: 'Credit Card', description: 'Credit card debt', icon: '💳', type: 'debt' },
    { name: 'Personal Loan', description: 'Personal loans', icon: '🏦', type: 'debt' },
    { name: 'Mortgage', description: 'Home mortgage', icon: '🏡', type: 'debt' },
    { name: 'Student Loan', description: 'Education loans', icon: '🎓', type: 'debt' },
    { name: 'Car Loan', description: 'Vehicle financing', icon: '🚙', type: 'debt' },
    { name: 'Business Loan', description: 'Business financing', icon: '🏢', type: 'debt' },
  ]
};

const DEFAULT_ICONS = ['🍽️', '🚗', '🛍️', '🎬', '📄', '🏥', '📚', '✈️', '🏠', '💄', '💼', '🏢', '📈', '💻', '💰', '💳', '🏦', '🏡', '🎓', '🚙'];

export const initializeDefaultCategories = (userId) => {
  try {
    const existingCategories = realm.objects('Category').filtered('userId == $0', userId);
    if (existingCategories.length > 0) return;

    realm.write(() => {
      const allCategories = [
        ...DEFAULT_CATEGORIES.income,
        ...DEFAULT_CATEGORIES.expense,
        ...DEFAULT_CATEGORIES.debt
      ];

      allCategories.forEach((cat, index) => {
        const categoryId = uuid.v4();
        realm.create('Category', {
          id: categoryId,
          name: cat.name,
          description: cat.description || '',
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          icon: cat.icon,
          userId: userId,
          type: cat.type,
          parentCategoryId: null,
          isActive: true,
          createdOn: new Date(),
          updatedOn: new Date(),
          syncStatus: 'pending',
          lastSyncAt: null,
          needsUpload: true,
        });

        realm.create('SyncLog', {
          id: uuid.v4(),
          userId: userId,
          tableName: 'categories',
          recordId: categoryId,
          operation: 'create',
          status: 'pending',
          createdOn: new Date(),
        });
      });
    });
  } catch (error) {
    console.error('Error initializing default categories:', error);
  }
};

const CategoriesScreen = ({ navigation, route, isBottomSheet = false }) => {
  const [categories, setCategories] = useState([]);
  const [selectedType, setSelectedType] = useState('expense');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [parentCategories, setParentCategories] = useState([]);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const { t } = useTranslation();
  const netInfo = useNetInfo();
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [selectedCategoryForMenu, setSelectedCategoryForMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  const { onSelectCategoryRoute, forBudget, forTransaction, transactionType, onSelectCategory } = route.params || {};

  const getCategoryTypeForTransaction = () => {
    if (['credit', 'receive', 'cash_in'].includes(transactionType)) return 'income';
    if (['debit', 'send_out', 'cash_out'].includes(transactionType)) return 'expense';
    if (['borrow', 'lend'].includes(transactionType)) return 'debt';
    return 'expense'; // default
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: CATEGORY_COLORS[0],
    icon: '📊',
    parent_category_id: '',
    type: 'expense',
  });

  useEffect(() => {
    fetchCategories();
    if (forTransaction) {
      setSelectedType(getCategoryTypeForTransaction());
    }
  }, [transactionType]);

  const fetchCategories = async () => {
    try {
      // Get the current user from Realm
      const users = getAllObjects('User');
      if (!users.length) {
        setIsLoading(false);
        setRefreshing(false);
        return;
      }
      const currentUser = users[0];
      const userId = currentUser.supabaseId;
      const userType = currentUser.userType || 'free';
      const isOnline = netInfo.isConnected;

      // Check if we need to fetch from Supabase or Realm
      if (userType === 'paid' && isOnline) {
        // Online paid user - fetch from Supabase
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .or(`user_id.eq.${userId},user_id.is.null`)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        
        // Add categories to Realm for local access
        if (data && data.length > 0) {
          realm.write(() => {
            data.forEach(category => {
              const existingCategory = realm.objects('Category').filtered('id == $0', category.id)[0];
              
              if (existingCategory) {
                // Update existing category
                existingCategory.name = category.name;
                existingCategory.description = category.description || '';
                existingCategory.color = category.color || CATEGORY_COLORS[0];
                existingCategory.icon = category.icon || '📊';
                existingCategory.parentCategoryId = category.parent_category_id || null;
                existingCategory.isActive = category.is_active;
                existingCategory.updatedOn = new Date(category.updated_on);
                existingCategory.syncStatus = 'synced';
                existingCategory.lastSyncAt = new Date();
              } else {
                // Create new category
                realm.create('Category', {
                  id: category.id,
                  name: category.name,
                  description: category.description || '',
                  color: category.color || CATEGORY_COLORS[0],
                  icon: category.icon || '📊',
                  userId: userId,
                  parentCategoryId: category.parent_category_id || null,
                  isActive: category.is_active,
                  createdOn: new Date(category.created_on),
                  updatedOn: new Date(category.updated_on),
                  syncStatus: 'synced',
                  lastSyncAt: new Date(),
                  needsUpload: false,
                });
              }
            });
          });
        }
      }

      // Get categories from Realm (whether we just updated them or not)
      const realmCategories = Array.from(realm.objects('Category').filtered('isActive == true').sorted('name'));
      
      // Process categories into parent-child structure
      const categoriesMap = new Map();
      const rootCategories = [];
      
      realmCategories.forEach(category => {
        categoriesMap.set(category.id, { 
          ...category,
          id: category.id,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          user_id: category.userId,
          parent_category_id: category.parentCategoryId,
          is_active: category.isActive,
          created_on: category.createdOn,
          updated_on: category.updatedOn,
          subcategories: [] 
        });
      });
      
      realmCategories.forEach(category => {
        if (category.parentCategoryId) {
          const parent = categoriesMap.get(category.parentCategoryId);
          if (parent) {
            parent.subcategories.push(categoriesMap.get(category.id));
          } else {
            rootCategories.push(categoriesMap.get(category.id));
          }
        } else {
          rootCategories.push(categoriesMap.get(category.id));
        }
      });
      
      setCategories(rootCategories);
      
      // Set parent categories for the picker
      const potentialParents = realmCategories.filter(cat => !cat.parentCategoryId);
      setParentCategories(potentialParents);
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert(t('common.error'), t('categoriesScreen.errors.loadCategories', 'Failed to load categories'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const openMenu = (category, event) => {
    const { pageX, pageY } = event.nativeEvent;
    const screenWidth = Dimensions.get('window').width;
    const menuWidth = 150;
    
    let x = pageX;
    if (pageX + menuWidth > screenWidth) {
        x = screenWidth - menuWidth - 16;
    }

    setSelectedCategoryForMenu(category);
    setMenuPosition({ x, y: pageY });
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedCategoryForMenu(null);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      color: CATEGORY_COLORS[0],
      icon: '📊',
      parent_category_id: '',
      type: 'expense',
    });
    setShowModal(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || CATEGORY_COLORS[0],
      icon: category.icon || '📊',
      parent_category_id: category.parent_category_id || '',
      type: category.type || 'expense',
    });
    setShowModal(true);
  };

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      Alert.alert(t('common.error'), t('categoriesScreen.errors.nameRequired', 'Category name is required'));
      return;
    }

    try {
      // Get the current user from Realm
      const users = getAllObjects('User');
      if (!users.length) {
        Alert.alert(t('common.error'), t('categoriesScreen.errors.noUserFound', 'No user found'));
        return;
      }
      
      const currentUser = users[0];
      const userId = currentUser.id;
      const supabaseUserId = currentUser.supabaseId;
      const userType = currentUser.userType || 'free';
      const isOnline = netInfo.isConnected;

      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        color: formData.color,
        icon: formData.icon.trim() || '📊',
        parentCategoryId: formData.parent_category_id || null,
        type: formData.type,
        userId: userId,
        isActive: true,
        updatedOn: new Date(),
      };

      if (userType === 'paid' && isOnline) {
        // Online paid user - update Supabase and Realm
        const supabaseData = {
          name: categoryData.name,
          description: categoryData.description || null,
          color: categoryData.color,
          icon: categoryData.icon || null,
          parent_category_id: categoryData.parentCategoryId || null,
          type: categoryData.type,
          user_id: supabaseUserId,
          is_active: true,
        };

        if (editingCategory) {
          // Update existing category
          const { error } = await supabase
            .from('categories')
            .update(supabaseData)
            .eq('id', editingCategory.id);

          if (error) throw error;

          // Update in Realm
          realm.write(() => {
            realm.create('Category', {
              id: editingCategory.id,
              ...categoryData,
              syncStatus: 'synced',
              lastSyncAt: new Date(),
              needsUpload: false,
            }, 'modified');
          });
        } else {
          // Create new category
          const newId = uuid.v4();
          const { error } = await supabase
            .from('categories')
            .insert({
              id: newId,
              ...supabaseData,
              created_on: new Date().toISOString(),
            });

          if (error) throw error;

          // Create in Realm
          realm.write(() => {
            realm.create('Category', {
              id: newId,
              ...categoryData,
              createdOn: new Date(),
              syncStatus: 'synced',
              lastSyncAt: new Date(),
              needsUpload: false,
            });
          });
        }
      } else {
        // Offline or free user - update Realm only and queue for sync
        realm.write(() => {
          if (editingCategory) {
            // Update existing category
            realm.create('Category', {
              id: editingCategory.id,
              ...categoryData,
              syncStatus: 'pending',
              needsUpload: true,
            }, 'modified');

            const existingLog = realm.objects('SyncLog').filtered('recordId == $0 AND (status == "pending" OR status == "failed")', editingCategory.id)[0];

            if (!existingLog) {
              realm.create('SyncLog', {
                id: uuid.v4(),
                userId: userId,
                tableName: 'categories',
                recordId: editingCategory.id,
                operation: 'update',
                status: 'pending',
                createdOn: new Date(),
              });
            }
          } else {
            // Create new category
            const newId = uuid.v4();
            realm.create('Category', {
              id: newId,
              ...categoryData,
              createdOn: new Date(),
              syncStatus: 'pending',
              needsUpload: true,
            });

            realm.create('SyncLog', {
              id: uuid.v4(),
              userId: userId,
              tableName: 'categories',
              recordId: newId,
              operation: 'create',
              status: 'pending',
              createdOn: new Date(),
            });
          }
        });
      }

      setShowModal(false);
      Alert.alert(
        t('common.success'), 
        editingCategory 
          ? t('categoriesScreen.success.categoryUpdated', 'Category updated successfully') 
          : t('categoriesScreen.success.categoryCreated', 'Category created successfully')
      );
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert(t('common.error'), t('categoriesScreen.errors.saveCategory', 'Failed to save category'));
    }
  };

  const handleSelectCategory = (category) => {
    if (onSelectCategory) {
      // If direct callback is provided (for bottom sheet)
      onSelectCategory(category.id);
    } else if (onSelectCategoryRoute) {
      // Legacy navigation method
      navigation.navigate(onSelectCategoryRoute, { selectedCategoryId: category.id });
    }
  };

  const handleDeleteCategory = async (category) => {
    Alert.alert(
      t('categoriesScreen.confirm.deleteTitle', 'Delete Category'),
      t('categoriesScreen.confirm.deleteMessage', `Are you sure you want to delete "${category.name}"? This action cannot be undone.`),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Get the current user from Realm
              const users = getAllObjects('User');
              if (!users.length) return;
              
              const currentUser = users[0];
              const userId = currentUser.id;
              const supabaseUserId = currentUser.supabaseId;
              const userType = currentUser.userType || 'free';
              const isOnline = netInfo.isConnected;

              if (userType === 'paid' && isOnline) {
                // Online paid user - update Supabase and Realm
                const { error } = await supabase
                  .from('categories')
                  .update({ is_active: false })
                  .eq('id', category.id);

                if (error) throw error;

                // Update in Realm
                realm.write(() => {
                  realm.create('Category', {
                    id: category.id,
                    isActive: false,
                    updatedOn: new Date(),
                    syncStatus: 'synced',
                    lastSyncAt: new Date(),
                    needsUpload: false,
                  }, 'modified');
                });
              } else {
                // Offline or free user - update Realm only and queue for sync
                realm.write(() => {
                  realm.create('Category', {
                    id: category.id,
                    isActive: false,
                    updatedOn: new Date(),
                    syncStatus: 'pending',
                    needsUpload: true,
                  }, 'modified');

                  const existingLog = realm.objects('SyncLog').filtered('recordId == $0 AND (status == "pending" OR status == "failed")', category.id)[0];

                  if (!existingLog) {
                    realm.create('SyncLog', {
                      id: uuid.v4(),
                      userId: userId,
                      tableName: 'categories',
                      recordId: category.id,
                      operation: 'update',
                      status: 'pending',
                      createdOn: new Date(),
                    });
                  }
                });
              }

              Alert.alert(t('common.success'), t('categoriesScreen.success.categoryDeleted', 'Category deleted successfully'));
              fetchCategories();
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert(t('common.error'), t('categoriesScreen.errors.deleteCategory', 'Failed to delete category'));
            }
          },
        },
      ]
    );
  };

  const getFilteredCategories = () => {
    if (forTransaction) {
        const type = getCategoryTypeForTransaction();
        return categories.filter(category => category.type === type);
    }
    return categories.filter(category => category.type === selectedType);
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity onPress={() => onSelectCategoryRoute || onSelectCategory ? handleSelectCategory(item) : {}}>
      <View style={styles.categoryContainer}>
        <View style={styles.categoryItem}>
          <View style={styles.categoryLeft}>
            <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
            <View style={styles.categoryInfo}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryIcon}>{item.icon}</Text>
                <Text style={styles.categoryName}>{item.name}</Text>
              </View>
              {item.description && (
                <Text style={styles.categoryDescription}>{item.description}</Text>
              )}
            </View>
          </View>
          <View style={styles.categoryActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => openMenu(item, e)}
            >
              <MoreVertical size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        
        {item.subcategories && item.subcategories.length > 0 && (
          <View style={styles.subcategoriesContainer}>
            {item.subcategories.map((subcat) => (
              <TouchableOpacity key={subcat.id} onPress={() => onSelectCategoryRoute || onSelectCategory ? handleSelectCategory(subcat) : {}}>
                <View style={styles.subcategoryItem}>
                  <View style={styles.subcategoryLeft}>
                    <View style={[styles.colorIndicator, { backgroundColor: subcat.color }]} />
                    <View style={styles.categoryInfo}>
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryIcon}>{subcat.icon}</Text>
                        <Text style={styles.subcategoryName}>{subcat.name}</Text>
                      </View>
                      {subcat.description && (
                        <Text style={styles.categoryDescription}>{subcat.description}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => openMenu(subcat, e)}
                    >
                      <MoreVertical size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const selectParentCategory = (parentCategory) => {
    setFormData(prev => ({
      ...prev,
      parent_category_id: parentCategory ? parentCategory.id : '',
    }));
    setShowParentPicker(false);
  };

  const getParentCategoryName = () => {
    if (!formData.parent_category_id) return '';
    const parent = parentCategories.find(cat => cat.id === formData.parent_category_id);
    return parent ? parent.name : '';
  };

  const renderMenu = () => (
    <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
    >
        <TouchableWithoutFeedback onPress={closeMenu}>
            <View style={StyleSheet.absoluteFill}>
                <View style={[styles.menuContainer, { top: menuPosition.y, left: menuPosition.x }]}>
                    <TouchableOpacity style={styles.menuOption} onPress={() => {
                        closeMenu();
                        handleEditCategory(selectedCategoryForMenu);
                    }}>
                        <Edit size={16} color="#333" style={styles.menuIcon} />
                        <Text style={styles.menuText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuOption} onPress={() => {
                        closeMenu();
                        handleDeleteCategory(selectedCategoryForMenu);
                    }}>
                        <Trash2 size={16} color="#FF3B30" style={styles.menuIcon} />
                        <Text style={[styles.menuText, { color: '#FF3B30' }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={isBottomSheet ? [] : ['bottom', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {t('categoriesScreen.loading', 'Loading categories...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={isBottomSheet ? [] : ['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {renderMenu()}
      {/* Header */}
      {!isBottomSheet && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('categoriesScreen.title', 'Categories')}</Text>
          <TouchableOpacity onPress={handleAddCategory}>
            <Plus size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Category Type Filter */}
      <View style={styles.filterContainer}>
        {(forBudget ? ['expense', 'debt'] : forTransaction ? [getCategoryTypeForTransaction()] : ['income', 'expense', 'debt']).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              selectedType === type && styles.filterButtonActive
            ]}
            onPress={() => setSelectedType(type)}
          >
            <Text style={[
              styles.filterText,
              selectedType === type && styles.filterTextActive
            ]}>
              {t(`categoriesScreen.types.${type}`, type.charAt(0).toUpperCase() + type.slice(1))}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Categories List */}
      <FlatList
        data={getFilteredCategories()}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Tag size={48} color="#999" />
            <Text style={styles.emptyTitle}>{t('categoriesScreen.empty.title', 'No Categories')}</Text>
            <Text style={styles.emptyText}>
              {t('categoriesScreen.empty.message', 'Add your first category to get started')}
            </Text>
          </View>
        }
      />

      {/* Add/Edit Category Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <X size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingCategory 
                ? t('categoriesScreen.modals.editTitle', 'Edit Category') 
                : t('categoriesScreen.modals.addTitle', 'Add Category')}
            </Text>
            <TouchableOpacity onPress={handleSaveCategory}>
              <Save size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('categoriesScreen.labels.type', 'Type')}</Text>
              <View style={styles.filterContainerModal}>
                {(['income', 'expense', 'debt']).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterButton,
                      formData.type === type && styles.filterButtonActive
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, type: type }))}
                  >
                    <Text style={[
                      styles.filterText,
                      formData.type === type && styles.filterTextActive
                    ]}>
                      {t(`categoriesScreen.types.${type}`, type.charAt(0).toUpperCase() + type.slice(1))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('categoriesScreen.labels.name', 'Name')} *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder={t('categoriesScreen.placeholders.name', 'Category name')}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('categoriesScreen.labels.description', 'Description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder={t('categoriesScreen.placeholders.description', 'Category description')}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('categoriesScreen.labels.icon', 'Icon')}</Text>
              <TextInput
                style={styles.input}
                value={formData.icon}
                onChangeText={(text) => setFormData(prev => ({ ...prev, icon: text }))}
                placeholder={t('categoriesScreen.placeholders.icon', 'Emoji icon (e.g., 🍽️)')}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('categoriesScreen.labels.color', 'Color')}</Text>
              <View style={styles.colorPicker}>
                {CATEGORY_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.color === color && styles.colorOptionSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('categoriesScreen.labels.parentCategory', 'Parent Category')}</Text>
              <TouchableOpacity
                style={styles.pickerContainer}
                onPress={() => setShowParentPicker(true)}
              >
                <View style={styles.picker}>
                  <Text style={styles.pickerText}>
                    {formData.parent_category_id
                      ? getParentCategoryName()
                      : t('categoriesScreen.placeholders.noParent', 'No parent category')}
                  </Text>
                  <ChevronRight size={20} color="#666" />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Parent Category Picker Modal */}
      <Modal
        visible={showParentPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowParentPicker(false)}
      >
        <View style={styles.pickerModalContainer}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>
                {t('categoriesScreen.modals.selectParent', 'Select Parent Category')}
              </Text>
              <TouchableOpacity onPress={() => setShowParentPicker(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.pickerOption}
              onPress={() => selectParentCategory(null)}
            >
              <Text style={styles.pickerOptionText}>
                {t('categoriesScreen.placeholders.noParent', 'No parent category')}
              </Text>
            </TouchableOpacity>
            
            <FlatList
              data={parentCategories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.pickerOption}
                  onPress={() => selectParentCategory(item)}
                >
                  <View style={styles.pickerOptionContent}>
                    <Text style={styles.pickerOptionIcon}>{item.icon}</Text>
                    <Text style={styles.pickerOptionText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: RFPercentage(2.5),
    fontWeight: '700',
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#F8F9FA',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: RFPercentage(1.8),
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 60,
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryIcon: {
    fontSize: RFPercentage(2.2),
    marginRight: 8,
  },
  categoryName: {
    fontSize: RFPercentage(2),
    fontWeight: '600',
    color: '#333',
  },
  categoryDescription: {
    fontSize: RFPercentage(1.6),
    color: '#666',
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },
  subcategoriesContainer: {
    paddingLeft: 32,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingLeft: 16,
  },
  subcategoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subcategoryName: {
    fontSize: RFPercentage(1.8),
    fontWeight: '500',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: RFPercentage(2.2),
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: RFPercentage(1.8),
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: RFPercentage(2),
    color: '#666',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: RFPercentage(2.2),
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: RFPercentage(1.8),
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: RFPercentage(1.8),
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  pickerText: {
    fontSize: RFPercentage(1.8),
    color: '#333',
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  pickerModalTitle: {
    fontSize: RFPercentage(2.2),
    fontWeight: '600',
    color: '#333',
  },
  pickerOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerOptionIcon: {
    fontSize: RFPercentage(2.2),
    marginRight: 12,
  },
  pickerOptionText: {
    fontSize: RFPercentage(1.8),
    color: '#333',
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    paddingVertical: 8,
    width: 150,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
      fontSize: RFPercentage(1.8),
      color: '#333',
  },
  filterContainerModal: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
});

export default CategoriesScreen; 