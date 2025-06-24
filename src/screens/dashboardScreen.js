import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { screens } from '../constant/screens';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import React, { useEffect, useState } from 'react';
import { realm, getAllObjects, deleteObject } from '../realm';
import { supabase } from '../supabase';
import { useTranslation } from 'react-i18next';

const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    error: '#dc2626',
    background: '#f8fafc',
    white: '#ffffff',
    gray: '#6b7280',
    lightGray: '#f3f4f6',
    border: '#e5e7eb',
    cardBackground: 'rgba(255, 255, 255, 0.15)',
    balance: '#4b5eAA',
};

const CARD_COLORS = {
    green: {
        border: colors.success,
        background: '#e8f5e9',
        text: colors.success,
    },
    yellow: {
        border: '#f59e42',
        background: '#fffde7',
        text: '#b45309',
    },
    blue: {
        border: colors.primary,
        background: '#e3f2fd',
        text: colors.primary,
    },
    red: {
        border: colors.error,
        background: '#ffebee',
        text: colors.error,
    },
    default: {
        border: colors.primary,
        background: colors.white,
        text: colors.primary,
    },
};

const DashboardScreen = ({ navigation }) => {
    const [accounts, setAccounts] = useState([]);
    const [user, setUser] = useState(null);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const realmUser = realm.objectForPrimaryKey('User', session.user.id);
                setUser(realmUser);
                
                // Fetch current user's data from Supabase
                try {
                    const { data: userData, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    
                    if (error) {
                        console.error('Error fetching user data:', error);
                        return;
                    }
                    
                    console.log('Current user data from Supabase:', userData);
                    console.log('Current user data from Realm:', realmUser);
                } catch (err) {
                    console.error('Exception while fetching users:', err);
                }
            }
        };

        fetchUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                const realmUser = realm.objectForPrimaryKey('User', session.user.id);
                if (realmUser) {
                    if (session.user.email_confirmed_at && !realmUser.emailConfirmed) {
                        realm.write(() => {
                            realmUser.emailConfirmed = true;
                            realmUser.updatedOn = new Date();
                        });
                    }
                    setUser(realm.objectForPrimaryKey('User', session.user.id));
                } else {
                    // This can happen if user signs in with Google for the first time.
                    // The user is created in loginScreen, so we just need to wait for it to be available.
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        });

        const accs = getAllObjects('Account');
        setAccounts([...accs]);

        const accountsListener = (collection) => {
            setAccounts([...collection]);
        };
        accs.addListener(accountsListener);

        return () => {
            if (accs && !accs.isInvalidated) {
                accs.removeListener(accountsListener);
            }
            authListener?.subscription.unsubscribe();
        };
    }, []);

    // Helper to safely format currency amounts, even if undefined/null
    const formatAmount = (amount, code = 'PKR') => {
        const numeric = Number(amount ?? 0);
        return `${code} ${numeric.toLocaleString()}`;
    };

    const getTranslatedAccountType = (typeCode) => {
        switch(typeCode) {
            case 'cash_in_out': return t('terms.cash_inCashOut');
            case 'debit_credit': return t('terms.debitCredit');
            case 'receive_send': return t('terms.receiveSendOut');
            case 'borrow_lend': return t('terms.borrowLend');
            default: return typeCode; // fallback
        }
    };

    const handleMorePress = (account) => {
        // Create a serializable version of the account
        const serializedAccount = {
            ...account,
            createdOn: account.createdOn?.toISOString(),
            updatedOn: account.updatedOn?.toISOString(),
        };

        Alert.alert(t('dashboardScreen.accountOptions'), account.name, [
            {
                text: t('common.edit'),
                onPress: () => navigation.navigate(screens.NewAccount, {
                    account: serializedAccount
                })
            },
            {
                text: t('common.delete'),
                style: 'destructive',
                onPress: () => deleteObject('Account', account.id)
            },
            {
                text: t('common.cancel'),
                style: 'cancel'
            },
        ]);
    };
    
    const handleAccountPress = (account) => {
        navigation.navigate(screens.AccountDetails, {
            accountId: account.id
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.headerContainer}>
                    <Text style={styles.headerText}>
                        {t('dashboardScreen.myAccounts')}
                    </Text>
                    {user?.userType !== 'paid' && (
                        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                            <Icon name="workspace-premium" size={RFValue(24)} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.accountsSection}>
                    {accounts.map((account, index) => {
                        // Determine a color for each account. If the account already
                        // has a .color property use it, otherwise rotate through our
                        // predefined palette so that every card gets a different color.
                        const palette = ['green', 'yellow', 'blue', 'red'];
                        const computedColorKey = account.color ?? palette[index % palette.length];
                        const cardColors = CARD_COLORS[computedColorKey] || CARD_COLORS.default;
                        return (
                            <TouchableOpacity
                                key={account.id}
                                style={[
                                    styles.accountCard,
                                    {
                                        borderLeftColor: cardColors.border,
                                        backgroundColor: cardColors.background,
                                    },
                                ]}
                                onPress={() => handleAccountPress(account)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.accountHeader}>
                                    <View style={styles.accountInfo}>
                                        <Text style={[
                                            styles.accountName,
                                            { color: cardColors.text }
                                        ]}>
                                            {account.name}
                                        </Text>
                                        {account.id === 1 && (
                                            <Text style={[
                                                styles.primaryTag,
                                                { backgroundColor: '#fefcbf', color: cardColors.text }
                                            ]}>
                                                {t('dashboardScreen.primaryTag')}
                                            </Text>
                                        )}
                                        <View style={styles.currencyContainer}>
                                            <Icon name="flag" size={RFValue(20)} color={cardColors.text} />
                                            <Text style={[
                                                styles.currencyText,
                                                { color: cardColors.text }
                                            ]}>
                                                {account.currency}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={styles.moreButton} onPress={() => handleMorePress(account)}>
                                        <Icon name="more-vert" size={RFValue(22)} color={cardColors.text} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.accountFooter}>
                                    <Text style={[
                                        styles.accountOption,
                                        { color: cardColors.text }
                                    ]}>
                                        {t(`accountTypes.${account.type}`)}
                                    </Text>
                                    <Text style={[
                                        styles.accountBalance,
                                        { color: cardColors.text }
                                    ]}>
                                        {formatAmount(account.currentBalance, account.currency)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <TouchableOpacity
                    style={styles.addWalletButton}
                    onPress={() => navigation.navigate(screens.NewAccount)}
                >
                    <Icon name="add" size={RFValue(24)} color={colors.gray} />
                    <Text style={styles.addWalletText}>{t('dashboardScreen.addAccount')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: wp(4.5),
        paddingTop: hp(2.25),
    },
    headerText: {
        fontSize: RFValue(20),
        fontFamily: 'Sora-Bold',
        color: '#2563eb',
    },
    accountsSection: {
        padding: wp(4.5), // ~18px on a 400px width screen
    },
    accountCard: {
        borderRadius: wp(3),
        padding: wp(4),
        marginBottom: hp(2),
        borderLeftWidth: wp(1.5),
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    accountHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: hp(1.25), // ~10px
    },
    accountInfo: {
        flex: 1
    },
    accountName: {
        fontSize: RFValue(16),
        fontFamily: 'Sora-SemiBold',
        color: '#1e293b',
        marginBottom: hp(0.5),
    },
    primaryTag: {
        fontSize: RFPercentage(1.7), // ~12px
        fontFamily: 'Sora-Regular',
        paddingHorizontal: wp(2), // ~8px
        paddingVertical: hp(0.25), // ~2px
        borderRadius: wp(2), // ~8px
        alignSelf: 'flex-start',
        marginBottom: hp(0.5), // ~4px
    },
    currencyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencyText: {
        fontSize: RFPercentage(2), // ~14px
        fontFamily: 'Sora-Regular',
        marginLeft: wp(1.5), // ~6px
    },
    moreButton: {
        width: wp(10), // ~40px on a 400px width screen
        height: wp(10),
        borderRadius: wp(5), // ~20px
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    accountFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: hp(1.5), // ~12px
    },
    accountOption: {
        fontSize: RFPercentage(2), // ~14px
        fontFamily: 'Sora-Regular',
    },
    accountBalance: {
        fontSize: RFValue(20),
        fontFamily: 'Sora-Bold',
        color: '#2563eb',
    },
    addWalletButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.gray,
        borderStyle: 'dashed',
        paddingVertical: hp(1.75), // ~14px
        borderRadius: wp(2), // ~8px
        margin: wp(4.5), // ~18px
        backgroundColor: 'transparent',
    },
    addWalletText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        color: colors.gray,
        marginLeft: wp(2), // ~8px
    },
});

export default DashboardScreen;