import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl,
    Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { RFPercentage } from 'react-native-responsive-fontsize';
import { realm, getAllObjects } from '../realm';
import { deleteBudgetInSupabase } from '../supabase';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Progress from 'react-native-progress';
import moment from 'moment';

import { Plus, Edit, Trash2, MoreVertical, Tag } from 'lucide-react-native';

const colors = {
    primary: '#2563eb',
    background: '#f8fafc',
    white: '#ffffff',
    border: '#e5e7eb',
    text: '#1e293b',
    lightText: '#4b5563',
    error: '#dc2626',
    success: '#16a34a',
};

const BudgetScreen = () => {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const netInfo = useNetInfo();
    
    const [budgets, setBudgets] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [categoryMap, setCategoryMap] = useState({});

    const fetchBudgets = useCallback(() => {
        setRefreshing(true);
        try {
            const allBudgets = getAllObjects('Budget').filtered('isActive == true').sorted('endDate', false);
            const allCategories = getAllObjects('Category');

            const catMap = allCategories.reduce((map, cat) => {
                map[cat.id] = cat;
                return map;
            }, {});
            setCategoryMap(catMap);

            const budgetData = allBudgets.map(budget => {
                const spent = getBudgetSpent(budget, catMap);
                const progress = budget.amount > 0 ? spent / budget.amount : 0;
                return {
                    ...budget,
                    id: budget.id,
                    spent,
                    progress,
                };
            });
            
            setBudgets(budgetData);
        } catch (error) {
            console.error("Failed to fetch budgets:", error);
        } finally {
            setRefreshing(false);
        }
    }, []);

    const getBudgetSpent = (budget, catMap) => {
        if (!budget.categoryId || !catMap[budget.categoryId]) {
            return 0;
        }

        const category = catMap[budget.categoryId];
        const subCategoryIds = Object.values(catMap)
            .filter(c => c.parentCategoryId === category.id)
            .map(c => c.id);
        const allCategoryIds = [category.id, ...subCategoryIds];
        
        const transactions = realm.objects('Transaction')
            .filtered(
                'categoryId IN $0 AND transactionDate >= $1 AND transactionDate <= $2 AND type IN $3',
                allCategoryIds,
                budget.startDate,
                budget.endDate,
                ['lend', 'cash_out', 'send_out', 'debit'] // Expense types
            );
        
        return transactions.reduce((sum, tx) => sum + tx.amount, 0);
    };

    useFocusEffect(fetchBudgets);

    const onRefresh = () => {
        fetchBudgets();
    };

    const handleDelete = async (budgetId) => {
        Alert.alert(
            t('budgets.deleteTitle'),
            t('budgets.deleteMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        const user = getAllObjects('User')[0];
                        const isPaidUser = user.userType === 'paid';
                        const isOnline = netInfo.isConnected;

                        try {
                            if (isPaidUser && isOnline) {
                                await deleteBudgetInSupabase(budgetId);
                            }
                            realm.write(() => {
                                const budgetToDelete = realm.objectForPrimaryKey('Budget', budgetId);
                                if (budgetToDelete) {
                                    if(isPaidUser && isOnline) {
                                        realm.delete(budgetToDelete);
                                    } else {
                                        budgetToDelete.isActive = false;
                                        budgetToDelete.needsUpload = true;
                                        budgetToDelete.syncStatus = 'pending';
                                    }
                                }
                            });
                            fetchBudgets();
                        } catch (error) {
                            console.error("Failed to delete budget:", error);
                            Alert.alert(t('common.error'), t('budgets.errors.deleteFailed'));
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }) => {
        const category = categoryMap[item.categoryId];
        const daysLeft = moment(item.endDate).diff(moment(), 'days');
        const progressColor = item.progress > 0.8 ? colors.error : (item.progress > 0.5 ? '#f59e0b' : colors.success);

        return (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AddBudget', { budget: item })}>
                <View style={styles.cardHeader}>
                    <View style={styles.categoryInfo}>
                        <Text style={styles.categoryIcon}>{category?.icon || '📁'}</Text>
                        <View>
                            <Text style={styles.budgetName}>{item.name}</Text>
                            <Text style={styles.categoryName}>{category?.name || t('budgets.noCategory')}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                        <Trash2 size={20} color={colors.lightText} />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.progressContainer}>
                    <Progress.Bar progress={item.progress} width={null} color={progressColor} style={styles.progressBar} />
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.amountText}>{`${item.spent.toFixed(2)} / ${item.amount.toFixed(2)}`}</Text>
                    <Text style={styles.daysLeft}>{t('budgets.daysLeft', { count: daysLeft })}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('budgets.title')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AddBudget')}>
                    <Plus size={28} color={colors.primary} />
                </TouchableOpacity>
            </View>
            <FlatList
                data={budgets}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Tag size={48} color="#999" />
                        <Text style={styles.emptyTitle}>{t('budgets.empty.title')}</Text>
                        <Text style={styles.emptyText}>{t('budgets.empty.message')}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: RFPercentage(3), fontWeight: 'bold', color: colors.text },
    listContainer: { padding: wp(4) },
    card: {
        backgroundColor: colors.white,
        borderRadius: 12,
        marginBottom: hp(2),
        padding: wp(4),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: hp(1.5) },
    categoryInfo: { flexDirection: 'row', alignItems: 'center' },
    categoryIcon: { fontSize: RFPercentage(3), marginRight: wp(3) },
    budgetName: { fontSize: RFPercentage(2.2), fontWeight: 'bold', color: colors.text },
    categoryName: { fontSize: RFPercentage(1.8), color: colors.lightText },
    progressContainer: { marginVertical: hp(1) },
    progressBar: { height: 8, borderRadius: 4, backgroundColor: colors.border },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: hp(1.5) },
    amountText: { fontSize: RFPercentage(1.9), color: colors.text, fontWeight: '600' },
    daysLeft: { fontSize: RFPercentage(1.8), color: colors.lightText },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: hp(20) },
    emptyTitle: { fontSize: RFPercentage(2.5), fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 8 },
    emptyText: { fontSize: RFPercentage(2), color: '#666', textAlign: 'center' },
});

export default BudgetScreen;