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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { RFPercentage } from 'react-native-responsive-fontsize';
import { realm, getAllObjects } from '../realm';
import { createBudgetInSupabase, updateBudgetInSupabase } from '../supabase';
import uuid from 'react-native-uuid';
import { useNetInfo } from '@react-native-community/netinfo';

import StyledTextInput from '../components/shared/StyledTextInput';
import StyledPicker from '../components/shared/StyledPicker';
import DatePicker from '../components/recurring/DatePicker'; // Assuming this can be reused
import { ArrowLeft, Save, X } from 'lucide-react-native';

const colors = {
    primary: '#2563eb',
    background: '#f8fafc',
    white: '#ffffff',
    border: '#e5e7eb',
    text: '#1e293b',
    error: '#dc2626',
};

const AddBudgetScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { t } = useTranslation();
    const netInfo = useNetInfo();

    const [isEditing, setIsEditing] = useState(false);
    const [budgetId, setBudgetId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        period: 'monthly',
        categoryId: null,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    });

    const [categories, setCategories] = useState([]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerField, setDatePickerField] = useState('startDate');

    useEffect(() => {
        // Load categories for the picker
        const realmCategories = getAllObjects('Category').filtered('isActive == true');
        const categoryItems = realmCategories.map(cat => ({ label: `${cat.icon} ${cat.name}`, value: cat.id }));
        setCategories(categoryItems);

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
    }, [route.params?.budget]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDateChange = (date) => {
        setShowDatePicker(false);
        handleInputChange(datePickerField, date);
    };

    const openDatePicker = (field) => {
        setDatePickerField(field);
        setShowDatePicker(true);
    };
    
    const handleSave = async () => {
        // Validation
        if (!formData.name.trim() || !formData.amount.trim()) {
            Alert.alert(t('common.error'), t('addBudgetScreen.errors.requiredFields'));
            return;
        }

        const users = getAllObjects('User');
        if (!users.length) {
            Alert.alert(t('common.error'), t('addBudgetScreen.errors.noUser'));
            return;
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

        try {
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
            }
            navigation.goBack();
        } catch (error) {
            console.error("Failed to save budget:", error);
            Alert.alert(t('common.error'), t('addBudgetScreen.errors.saveFailed'));
        }
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
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEditing ? t('addBudgetScreen.editTitle') : t('addBudgetScreen.addTitle')}
                </Text>
                <TouchableOpacity onPress={handleSave}>
                    <Save size={24} color={colors.primary} />
                </TouchableOpacity>
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
                <StyledPicker
                    label={t('addBudgetScreen.labels.category')}
                    items={categories}
                    selectedValue={formData.categoryId}
                    onValueChange={(val) => handleInputChange('categoryId', val)}
                    placeholder={t('addBudgetScreen.placeholders.selectCategory')}
                />
                <TouchableOpacity onPress={() => openDatePicker('startDate')}>
                    <StyledTextInput
                        label={t('addBudgetScreen.labels.startDate')}
                        value={formData.startDate.toLocaleDateString()}
                        editable={false}
                    />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openDatePicker('endDate')}>
                    <StyledTextInput
                        label={t('addBudgetScreen.labels.endDate')}
                        value={formData.endDate.toLocaleDateString()}
                        editable={false}
                    />
                </TouchableOpacity>
            </ScrollView>

            {showDatePicker && (
                <DatePicker
                    isVisible={showDatePicker}
                    onConfirm={handleDateChange}
                    onCancel={() => setShowDatePicker(false)}
                    initialDate={formData[datePickerField]}
                />
            )}
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
});

export default AddBudgetScreen;