import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { realm, getAllObjects } from '../realm';
import { useTranslation } from 'react-i18next';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { RFPercentage } from 'react-native-responsive-fontsize';
import moment from 'moment';

import { ArrowUpRight, ArrowDownLeft, Calendar, Repeat, User, Tag } from 'lucide-react-native';

const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    error: '#dc2626',
    background: '#f8fafc',
    white: '#ffffff',
    gray: '#6b7280',
    lightGray: '#e0e0e0',
    border: '#e5e7eb',
    text: '#1e293b',
    lightText: '#4b5563'
};

const RecurringTransactionsScreen = () => {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchRecurringTransactions = useCallback(() => {
        try {
            setRefreshing(true);
            const recurringTxs = realm.objects('Transaction').filtered('isRecurring == true AND status != "cancelled"').sorted('transactionDate', true);
            
            const populatedTxs = recurringTxs.map(tx => {
                const contact = tx.contactId ? realm.objectForPrimaryKey('Contact', tx.contactId) : null;
                return {
                    ...tx,
                    id: tx.id,
                    contactName: contact ? contact.name : t('common.noContact'),
                };
            });

            setTransactions(Array.from(populatedTxs));
        } catch (error) {
            console.error("Failed to fetch recurring transactions:", error);
        } finally {
            setRefreshing(false);
        }
    }, [t]);

    useFocusEffect(
        useCallback(() => {
            fetchRecurringTransactions();
        }, [fetchRecurringTransactions])
    );

    const onRefresh = () => {
        fetchRecurringTransactions();
    };

    const renderItem = ({ item }) => {
        const isDebit = ['lend', 'cash_out', 'send_out', 'debit'].includes(item.type);
        const ArrowIcon = isDebit ? ArrowDownLeft : ArrowUpRight;
        const arrowColor = isDebit ? colors.error : colors.success;

        let recurringInfo = '';
        if (item.recurringPattern) {
            try {
                const pattern = JSON.parse(item.recurringPattern);
                const freq = pattern.frequency_type ? t(`recurring.${pattern.frequency_type}`) : '';
                const interval = pattern.interval_value;
                if (interval > 1) {
                    recurringInfo = `${t('recurring.every')} ${interval} ${freq}s`;
                } else {
                    recurringInfo = freq;
                }
            } catch (e) {
                recurringInfo = t('recurring.invalidPattern');
            }
        }

        return (
            <TouchableOpacity 
                style={styles.card} 
                onPress={() => navigation.navigate('AddNewRecord', { transactionId: item.id, mode: 'edit' })}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.purpose} numberOfLines={1}>{item.purpose || t('common.noPurpose')}</Text>
                    <View style={[styles.amountChip, { backgroundColor: isDebit ? '#fee2e2' : '#dcfce7' }]}>
                        <ArrowIcon color={arrowColor} size={16} style={{ marginRight: 4 }} />
                        <Text style={[styles.amountText, { color: arrowColor }]}>
                            {item.amount.toFixed(2)}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <User size={14} color={colors.lightText} />
                        <Text style={styles.contactName}>{item.contactName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Repeat size={14} color={colors.lightText} />
                        <Text style={styles.recurringText}>{recurringInfo}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Calendar size={14} color={colors.lightText} />
                        <Text style={styles.dateText}>
                            {`${t('recurring.startsOn')} ${moment(item.transactionDate).format('MMM D, YYYY')}`}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('recurring.title')}</Text>
            </View>
            <FlatList
                data={transactions}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Tag size={48} color="#999" />
                        <Text style={styles.emptyTitle}>{t('recurring.empty.title')}</Text>
                        <Text style={styles.emptyText}>{t('recurring.empty.message')}</Text>
                    </View>
                }
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
        padding: 20,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: RFPercentage(3),
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },
    listContainer: {
        padding: wp(4),
    },
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
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: hp(1.5),
    },
    purpose: {
        fontSize: RFPercentage(2.2),
        fontWeight: 'bold',
        color: colors.text,
        flex: 1,
        marginRight: wp(2),
    },
    amountChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: wp(2.5),
        paddingVertical: hp(0.5),
        borderRadius: 16,
    },
    amountText: {
        fontSize: RFPercentage(2),
        fontWeight: 'bold',
    },
    cardBody: {
        marginTop: hp(1),
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: hp(1),
    },
    contactName: {
        fontSize: RFPercentage(1.8),
        color: colors.lightText,
        marginLeft: wp(2),
    },
    recurringText: {
        fontSize: RFPercentage(1.8),
        color: colors.lightText,
        marginLeft: wp(2),
        textTransform: 'capitalize',
    },
    dateText: {
        fontSize: RFPercentage(1.8),
        color: colors.lightText,
        marginLeft: wp(2),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: hp(20),
    },
    emptyTitle: {
        fontSize: RFPercentage(2.5),
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: RFPercentage(2),
        color: '#666',
        textAlign: 'center',
    },
});

export default RecurringTransactionsScreen;
