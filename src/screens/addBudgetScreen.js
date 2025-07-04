import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { realm, getAllObjects, createSyncLog } from '../realm';
import { createBudgetInSupabase, updateBudgetInSupabase } from '../supabase';
import uuid from 'react-native-uuid';
import { useNetInfo } from '@react-native-community/netinfo';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import moment from 'moment';

import StyledTextInput from '../components/shared/StyledTextInput';
import StyledPicker from '../components/shared/StyledPicker';
import { ArrowLeft } from 'lucide-react-native';
import CategoryBottomSheet from '../components/CategoryBottomSheet';

const colors = {
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    background: '#f8fafc',
    white: '#ffffff',
    border: '#e5e7eb',
    text: '#1e293b',
    textSecondary: '#64748b',
    error: '#dc2626',
};

const AddBudgetScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { t } = useTranslation();
    const netInfo = useNetInfo();

    const [isEditing, setIsEditing] = useState(false);
    const [budgetId, setBudgetId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [activeDateField, setActiveDateField] = useState('startDate');
    const [isStartDateFocused, setIsStartDateFocused] = useState(false);
    const [isEndDateFocused, setIsEndDateFocused] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        period: 'monthly',
        categoryId: null,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    });

    const [categoryMap, setCategoryMap] = useState({});

    useEffect(() => {
        // Load categories for the picker
        const realmCategories = getAllObjects('Category').filtered('isActive == true');
        const catMap = realmCategories.reduce((map, cat) => {
            map[cat.id] = cat;
            return map;
        }, {});
        setCategoryMap(catMap);

        // Check if we are in edit mode
        if (route.params?.budget) {
            const { budget } = route.params;
            setIsEditing(true);
            setBudgetId(budget.id);
            setFormData({
                name: budget.name,
                amount: String(budget.amount),
                period: budget.period,
                categoryId: budget.categoryId,
                startDate: new Date(budget.startDate),
                endDate: new Date(budget.endDate),
            });
        }
        
        if (route.params?.selectedCategoryId) {
            handleInputChange('categoryId', route.params.selectedCategoryId);
        }
    }, [route.params?.budget, route.params?.selectedCategoryId]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || formData[activeDateField];
        setShowDatePicker(Platform.OS === 'ios');
        handleInputChange(activeDateField, currentDate);
        
        if (activeDateField === 'startDate') {
            setIsStartDateFocused(false);
        } else {
            setIsEndDateFocused(false);
        }
    };

    const formatDate = (date) => {
        return moment(date).format('ddd, MMM DD, YYYY');
    };

    const handleCancel = () => {
        navigation.goBack();
    };

    const handleSave = async () => {
        // Validation
        if (!formData.name.trim() || !formData.amount.trim()) {
            Alert.alert(t('common.error'), t('addBudgetScreen.errors.requiredFields'));
            return;
        }

        setIsLoading(true);

        try {
            const users = getAllObjects('User');
            if (!users.length) {
                throw new Error(t('addBudgetScreen.errors.noUser'));
            }
            
            const user = users[0];
            const isPaidUser = user.userType === 'paid';
            const isOnline = netInfo.isConnected;

            const budgetData = {
                name: formData.name.trim(),
                amount: parseFloat(formData.amount),
                period: formData.period,
                categoryId: formData.categoryId,
                startDate: formData.startDate,
                endDate: formData.endDate,
                userId: user.id,
                isActive: true,
            };

            if (isEditing) {
                // Update logic
                if (isPaidUser && isOnline) {
                    await updateBudgetInSupabase(budgetId, budgetData);
                }
                realm.write(() => {
                    realm.create('Budget', {
                        id: budgetId,
                        ...budgetData,
                        updatedOn: new Date(),
                        syncStatus: (isPaidUser && isOnline) ? 'synced' : 'pending',
                        needsUpload: !(isPaidUser && isOnline),
                    }, 'modified');
                });
                
                // Create a sync log for offline users or free users
                if (!isOnline || !isPaidUser) {
                    createSyncLog({
                        userId: user.id,
                        tableName: 'budgets',
                        recordId: budgetId,
                        operation: 'update',
                        status: 'pending'
                    });
                }
            } else {
                // Create logic
                const newId = uuid.v4();
                if (isPaidUser && isOnline) {
                    await createBudgetInSupabase({ ...budgetData, id: newId, userId: user.supabaseId });
                }
                realm.write(() => {
                    realm.create('Budget', {
                        id: newId,
                        ...budgetData,
                        createdOn: new Date(),
                        updatedOn: new Date(),
                        syncStatus: (isPaidUser && isOnline) ? 'synced' : 'pending',
                        needsUpload: !(isPaidUser && isOnline),
                    });
                });
                
                // Create a sync log for offline users or free users
                if (!isOnline || !isPaidUser) {
                    createSyncLog({
                        userId: user.id,
                        tableName: 'budgets',
                        recordId: newId,
                        operation: 'create',
                        status: 'pending'
                    });
                }
            }
            navigation.goBack();
        } catch (error) {
            console.error("Failed to save budget:", error);
            Alert.alert(t('common.error'), t('addBudgetScreen.errors.saveFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCategory = (categoryId) => {
        handleInputChange('categoryId', categoryId);
    };

    const periodOptions = [
        { label: t('periods.daily'), value: 'daily' },
        { label: t('periods.weekly'), value: 'weekly' },
        { label: t('periods.monthly'), value: 'monthly' },
        { label: t('periods.yearly'), value: 'yearly' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleCancel}>
                    <ArrowLeft size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEditing ? t('addBudgetScreen.editTitle') : t('addBudgetScreen.addTitle')}
                </Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <StyledTextInput
                    label={t('addBudgetScreen.labels.budgetName')}
                    value={formData.name}
                    onChangeText={(val) => handleInputChange('name', val)}
                    placeholder={t('addBudgetScreen.placeholders.budgetName')}
                />
                <StyledTextInput
                    label={t('addBudgetScreen.labels.amount')}
                    value={formData.amount}
                    onChangeText={(val) => handleInputChange('amount', val)}
                    placeholder="0.00"
                    keyboardType="numeric"
                />
                <StyledPicker
                    label={t('addBudgetScreen.labels.period')}
                    items={periodOptions}
                    selectedValue={formData.period}
                    onValueChange={(val) => handleInputChange('period', val)}
                />
                <TouchableOpacity onPress={() => setShowCategoryPicker(true)}>
                    <StyledTextInput
                        label={t('addBudgetScreen.labels.category')}
                        value={formData.categoryId && categoryMap[formData.categoryId] ? `${categoryMap[formData.categoryId].icon} ${categoryMap[formData.categoryId].name}`: ''}
                        placeholder={t('addBudgetScreen.placeholders.selectCategory')}
                        editable={false}
                        iconName="chevron-down"
                    />
                </TouchableOpacity>
                
                <View style={styles.cardContainer}>
                    <Text style={styles.sectionTitle}>{t('addBudgetScreen.labels.dateRange')}</Text>
                    <View style={styles.dateTimeRow}>
                        <TouchableOpacity
                            style={[styles.dateTimeInput, isStartDateFocused && styles.inputFocused]}
                            onPress={() => {
                                setActiveDateField('startDate');
                                setShowDatePicker(true);
                                setIsStartDateFocused(true);
                            }}
                            activeOpacity={0.8}
                            disabled={isLoading}
                        >
                            <Text style={styles.dateTimeLabel}>{t('addBudgetScreen.labels.startDate')}</Text>
                            <Text style={styles.dateTimeText}>{formatDate(formData.startDate)}</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={[styles.dateTimeRow, {marginTop: 10}]}>
                        <TouchableOpacity
                            style={[styles.dateTimeInput, isEndDateFocused && styles.inputFocused]}
                            onPress={() => {
                                setActiveDateField('endDate');
                                setShowDatePicker(true);
                                setIsEndDateFocused(true);
                            }}
                            activeOpacity={0.8}
                            disabled={isLoading}
                        >
                            <Text style={styles.dateTimeLabel}>{t('addBudgetScreen.labels.endDate')}</Text>
                            <Text style={styles.dateTimeText}>{formatDate(formData.endDate)}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                
            </ScrollView>
            
            <View style={styles.floatingButtonsContainer}>
                <LinearGradient
                    colors={['rgba(247, 250, 252, 0)', colors.background]}
                    style={styles.floatingButtonsGradient}
                >
                    <View style={styles.floatingButtons}>
                        <TouchableOpacity
                            style={[styles.floatingButton, styles.cancelButton]}
                            onPress={handleCancel}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                                {t('common.cancel', 'Cancel')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.floatingButton, styles.saveButton]}
                            onPress={handleSave}
                            activeOpacity={0.8}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.primaryDark]}
                                style={styles.saveButtonGradient}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={colors.white} size="small" />
                                ) : (
                                    <Text style={[styles.buttonText, { color: colors.white }]}>
                                        {isEditing ? t('common.update', 'Update') : t('common.save', 'Save')}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={formData[activeDateField]}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}

            <CategoryBottomSheet
                visible={showCategoryPicker}
                onClose={() => setShowCategoryPicker(false)}
                onSelectCategory={handleSelectCategory}
                forBudget={true}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: RFPercentage(2.5),
        fontWeight: 'bold',
        color: colors.text,
    },
    scrollContainer: {
        padding: wp(5),
    },
    cardContainer: {
        backgroundColor: colors.white,
        padding: wp(5),
        borderRadius: wp(2),
        marginBottom: wp(5),
    },
    sectionTitle: {
        fontSize: RFPercentage(2),
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: wp(2),
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateTimeInput: {
        flex: 1,
        padding: wp(3),
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: wp(2),
    },
    inputFocused: {
        borderColor: colors.primary,
    },
    dateTimeLabel: {
        fontSize: RFPercentage(1.5),
        color: colors.textSecondary,
    },
    dateTimeText: {
        fontSize: RFPercentage(1.5),
        fontWeight: 'bold',
        color: colors.text,
    },
    floatingButtonsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: wp(5),
    },
    floatingButtonsGradient: {
        borderRadius: wp(2),
    },
    floatingButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    floatingButton: {
        flex: 1,
        padding: wp(4),
        borderRadius: wp(2),
    },
    cancelButton: {
        backgroundColor: colors.white,
    },
    saveButton: {
        marginLeft: 10,
    },
    saveButtonGradient: {
        borderRadius: wp(2),
        alignItems: 'center',
        justifyContent: 'center',
        padding: wp(4),
    },
    buttonText: {
        fontSize: RFPercentage(2),
        fontWeight: 'bold',
        textAlign: 'center',
    },
    headerRight: {
        width: wp(24),
    },
});

export default AddBudgetScreen;