import React, { useEffect, useState, useContext, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
    Switch,
    TextInput,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Alert,
    Image,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { RFPercentage } from 'react-native-responsive-fontsize';
import { getAllObjects, updateObject, createObject, initializeRealm, realm } from '../realm';
import uuid from 'react-native-uuid';
import LinearGradient from 'react-native-linear-gradient';
import BiometricContext from '../../src/contexts/BiometricContext';
import { supabase, updateUserInSupabase } from '../supabase';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { useNetInfo } from '@react-native-community/netinfo';
import PinModal from '../components/PinModal';

// Import Lucide icons
import {
    User,
    Lock,
    Moon,
    Fingerprint,
    Shield,
    LogOut,
    ChevronRight,
    Tag,
    Repeat,
    Crown,
    Edit,
    X,
    ArrowLeft,
} from 'lucide-react-native';

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
    gradientStart: '#3b82f6',
    gradientEnd: '#1e40af',
};

const SettingsScreen = ({ navigation }) => {
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        language: 'English',
        emailConfirmed: false,
        biometricEnabled: false,
        pinEnabled: false,
        pinCode: '',
    });
    const [userId, setUserId] = useState(null);
    const [supabaseUserId, setSupabaseUserId] = useState(null);
    const [showBiometricConfirm, setShowBiometricConfirm] = useState(false);
    const [showPinSetup, setShowPinSetup] = useState(false);
    const { updateBiometricState, updatePinState } = useContext(BiometricContext);
    const { t } = useTranslation();
    const [userType, setUserType] = useState('free');
    const netInfo = useNetInfo();
    const [darkMode, setDarkMode] = useState(false); // Added for UI only
    const isMounted = useRef(true);

    useEffect(() => {
        loadUserData();
        const unsubscribe = navigation.addListener('focus', loadUserData);
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const safeAlert = (...args) => {
        if (isMounted.current) {
            Alert.alert(...args);
        }
    };

    const loadUserData = async () => {
        try {
            const users = getAllObjects('User');
            if (users.length > 0) {
                const u = users[0];
                setForm({
                    firstName: u.firstName ?? '',
                    lastName: u.lastName ?? '',
                    email: u.email ?? '',
                    language: u.language ?? 'English',
                    emailConfirmed: u.emailConfirmed ?? false,
                    biometricEnabled: u.biometricEnabled ?? false,
                    pinEnabled: u.pinEnabled ?? false,
                    pinCode: u.pinCode ?? '',
                });
                setUserType(u.userType || 'free');
                setUserId(u.id);
                setSupabaseUserId(u.supabaseId);
            }
        } catch (error) {
            safeAlert(t('common.error'), t('settingsScreen.errors.loadUser'));
        }
    };

    const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const saveSettings = async (settingsToUpdate) => {
        if (!userId) {
            safeAlert(t('common.error'), t('settingsScreen.errors.noUserFound'));
            return false;
        }

        const isPaidUser = userType === 'paid';
        const isOnline = netInfo.isConnected;

        try {
            if (isPaidUser && isOnline) {
                // Paid user, online -> Update Supabase directly
                const updatedUser = await updateUserInSupabase(supabaseUserId, settingsToUpdate);

                const realmUpdateData = {
                    id: userId,
                    updatedOn: new Date(updatedUser.updated_on),
                    syncStatus: 'synced',
                    lastSyncAt: new Date(),
                    needsUpload: false,
                };

                if (settingsToUpdate.biometricEnabled !== undefined) {
                    realmUpdateData.biometricEnabled = updatedUser.biometric_enabled;
                }
                if (settingsToUpdate.pinEnabled !== undefined) {
                    realmUpdateData.pinEnabled = updatedUser.pin_enabled;
                }
                if (settingsToUpdate.pinCode !== undefined) {
                    realmUpdateData.pinCode = updatedUser.pin_code;
                }

                realm.write(() => {
                    realm.create('User', realmUpdateData, 'modified');
                });
            } else {
                // Free user or offline -> Update Realm and queue for sync
                realm.write(() => {
                    realm.create('User', {
                        id: userId,
                        ...settingsToUpdate,
                        updatedOn: new Date(),
                        needsUpload: true,
                        syncStatus: 'pending',
                    }, 'modified');

                    const existingLog = realm.objects('SyncLog').filtered('recordId == $0 AND (status == "pending" OR status == "failed")', userId)[0];

                    if (!existingLog) {
                        realm.create('SyncLog', {
                            id: uuid.v4(),
                            userId: userId,
                            tableName: 'users',
                            recordId: userId,
                            operation: 'update',
                            status: 'pending',
                            createdOn: new Date(),
                        });
                    }
                });
            }

            // Update secure store and context
            if (settingsToUpdate.biometricEnabled !== undefined) {
                await SecureStore.setItemAsync('biometricEnabled', String(settingsToUpdate.biometricEnabled));
                updateBiometricState(settingsToUpdate.biometricEnabled);
            }
            if (settingsToUpdate.pinEnabled !== undefined) {
                await SecureStore.setItemAsync('pinEnabled', String(settingsToUpdate.pinEnabled));
                const pinToUpdate = settingsToUpdate.pinCode ?? form.pinCode;
                if (settingsToUpdate.pinCode) {
                    await SecureStore.setItemAsync('pinCode', settingsToUpdate.pinCode);
                }
                updatePinState(settingsToUpdate.pinEnabled, pinToUpdate);
            }
            return true;
        } catch (error) {
            safeAlert(t('common.error'), `${t('settingsScreen.errors.saveSettings')}: ${error.message}`);
            return false;
        }
    };

    const handleEditProfile = () => {
        safeAlert(t('settingsScreen.confirm.editProfileTitle'), t('settingsScreen.confirm.editProfileMessage'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('settingsScreen.buttons.proceed'), onPress: () => {
                if (isMounted.current) {
                    navigation.navigate('CreateProfile', {
                        mode: 'edit',
                        initialValues: {
                            firstName: form.firstName,
                            lastName: form.lastName,
                            email: form.email,
                        },
                        onSaveKey: 'settingsScreenRefresh',
                    });
                }
            }}
        ]);
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            const state = navigation.getState();
            if (state?.routes) {
                const currentRoute = state.routes[state.index];
                if (currentRoute.params?.onSaveKey === 'settingsScreenRefresh') {
                    loadUserData();
                }
            }
        });
        return unsubscribe;
    }, [navigation]);

    const handlePinToggle = async (value) => {
        if (value) {
            if (form.biometricEnabled) {
                updateField('biometricEnabled', false);
                await saveSettings({ biometricEnabled: false });
            }
            updateField('pinEnabled', true);
            if (form.pinCode) {
                await saveSettings({ pinEnabled: true });
            } else {
                setShowPinSetup(true);
            }
        } else {
            updateField('pinEnabled', false);
            await saveSettings({ pinEnabled: false });
        }
    };

    const handleChangePin = () => {
        setShowPinSetup(true);
    };

    const handlePinSetupComplete = async (pin) => {
        updateField('pinEnabled', true);
        updateField('pinCode', pin);
        await saveSettings({ pinEnabled: true, pinCode: pin });
        setShowPinSetup(false);
    };

    const toggleBiometric = async (val) => {
        setShowBiometricConfirm(false);
        const prevBiometricValue = form.biometricEnabled;
        const prevPinValue = form.pinEnabled;

        const settingsToSave = { biometricEnabled: val };
        updateField('biometricEnabled', val);

        if (val && prevPinValue) {
            updateField('pinEnabled', false);
            settingsToSave.pinEnabled = false;
        }

        const success = await saveSettings(settingsToSave);
        if (!success) {
            updateField('biometricEnabled', prevBiometricValue);
            if (settingsToSave.pinEnabled === false) {
                updateField('pinEnabled', prevPinValue);
            }
        }
    };

    const getDisplayName = () => {
        if (form.firstName || form.lastName) {
            return `${form.firstName || ''} ${form.lastName || ''}`.trim();
        }
        return form.email || t('common.notSet');
    };

    const getUserTypeColor = () => {
        return userType === 'paid' ? '#FFD700' : '#999';
    };

    const getUserTypeLabel = () => {
        return userType === 'paid' ? t('settingsScreen.labels.premiumUser', 'Premium User') : t('settingsScreen.labels.freeUser', 'Free User');
    };

    const handleLogout = async () => {
        Alert.alert(
            t('common.logout'),
            t('settingsScreen.confirm.logoutMessage', 'Are you sure you want to logout?'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.logout'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await supabase.auth.signOut();
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        } catch (error) {
                            Alert.alert(t('common.error'), error.message || 'Logout failed');
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
            
            {/* Header */}
            <View style={styles.header}>
                <User size={24} color={colors.primary} />
                <Text style={styles.headerTitle}>{t('settingsScreen.title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarPlaceholder}>
                                <User size={32} color="#666" />
                            </View>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.userName}>{getDisplayName()}</Text>
                            <Text style={styles.userEmail}>{form.email || t('common.notSet')}</Text>
                            <View style={styles.userTypeContainer}>
                                <Crown size={16} color={getUserTypeColor()} />
                                <Text style={[styles.userType, { color: getUserTypeColor() }]}>
                                    {getUserTypeLabel()}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={handleEditProfile} style={styles.editProfileButton}>
                            <Edit size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Security Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settingsScreen.sections.security')}</Text>
                    
                    <View style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <Fingerprint size={20} color={colors.primary} />
                            <Text style={styles.menuItemText}>{t('settingsScreen.labels.enableBiometric')}</Text>
                        </View>
                        <Switch
                            value={form.biometricEnabled}
                            onValueChange={() => setShowBiometricConfirm(true)}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.white}
                        />
                    </View>

                    <View style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <Shield size={20} color={colors.primary} />
                            <Text style={styles.menuItemText}>{t('settingsScreen.labels.enablePin')}</Text>
                        </View>
                        <Switch
                            value={form.pinEnabled}
                            onValueChange={handlePinToggle}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.white}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.changePinButton, !form.pinEnabled && styles.disabledButton]}
                        onPress={handleChangePin}
                        disabled={!form.pinEnabled}
                    >
                        <Text style={[styles.changePinText, !form.pinEnabled && styles.disabledText]}>
                            {form.pinCode ? t('settingsScreen.buttons.changePin') : t('settingsScreen.buttons.createPin', 'Create New PIN')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* App Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settingsScreen.sections.appSettings', 'App Settings')}</Text>
                    
                    <View style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <Moon size={20} color={colors.primary} />
                            <Text style={styles.menuItemText}>{t('settingsScreen.labels.darkMode', 'Dark Mode')}</Text>
                        </View>
                        <Switch
                            value={darkMode}
                            onValueChange={setDarkMode}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.white}
                        />
                    </View>
                </View>

                {/* Management */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settingsScreen.sections.management', 'Management')}</Text>
                    
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('CategoriesScreen')}
                    >
                        <View style={styles.menuItemLeft}>
                            <Tag size={20} color={colors.primary} />
                            <Text style={styles.menuItemText}>{t('settingsScreen.labels.manageCategories', 'Manage Categories')}</Text>
                        </View>
                        <ChevronRight size={20} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('RecurringTransactions')}
                    >
                        <View style={styles.menuItemLeft}>
                            <Repeat size={20} color={colors.primary} />
                            <Text style={styles.menuItemText}>{t('settingsScreen.labels.manageRecurring', 'Manage Recurring Transactions')}</Text>
                        </View>
                        <ChevronRight size={20} color="#999" />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                {userType === 'paid' && (
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <LogOut size={20} color={colors.error} />
                        <Text style={styles.logoutText}>
                            {t('common.logout')}
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Biometric Confirm Modal */}
            <Modal visible={showBiometricConfirm} transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('settingsScreen.modals.biometricTitle')}</Text>
                        <Text style={styles.modalText}>{t(form.biometricEnabled ? 'settingsScreen.modals.biometricDisableConfirm' : 'settingsScreen.modals.biometricEnableConfirm')}</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { borderRightWidth: 1, borderColor: colors.border }]}
                                onPress={() => setShowBiometricConfirm(false)}
                            >
                                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={() => toggleBiometric(!form.biometricEnabled)}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.primary }]}>{t('common.confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* PIN Setup Modal */}
            <PinModal
                visible={showPinSetup}
                onAuthenticated={handlePinSetupComplete}
                onCancel={() => {
                    setShowPinSetup(false);
                    setForm(prev => ({ ...prev, pinEnabled: false }));
                }}
                title={t('settingsScreen.pinSetup.title')}
                isPinCreationFlow={true}
            />
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
    headerTitle: {
        fontSize: RFPercentage(2.5),
        fontWeight: '700',
        color: '#333',
    },
    profileSection: {
        backgroundColor: '#FFFFFF',
        marginTop: 16,
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInfo: {
        flex: 1,
    },
    userName: {
        fontSize: RFPercentage(2.2),
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: RFPercentage(1.8),
        color: '#666',
        marginBottom: 8,
    },
    userTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userType: {
        fontSize: RFPercentage(1.7),
        fontWeight: '600',
        marginLeft: 4,
    },
    editProfileButton: {
        padding: 10,
        backgroundColor: '#F0F0F0',
        borderRadius: 20,
    },
    section: {
        backgroundColor: '#FFFFFF',
        marginTop: 16,
        marginHorizontal: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: RFPercentage(2),
        fontWeight: '600',
        color: '#333',
        padding: 16,
        paddingBottom: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuItemText: {
        fontSize: RFPercentage(1.9),
        color: '#333',
        marginLeft: 12,
    },
    changePinButton: {
        margin: 16,
        padding: hp(1.5),
        backgroundColor: colors.white,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    disabledButton: {
        borderColor: colors.lightGray,
        backgroundColor: colors.lightGray,
    },
    changePinText: {
        color: colors.primary,
        fontSize: RFPercentage(1.9),
        fontWeight: '600',
    },
    disabledText: {
        color: colors.gray,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginTop: 30,
        marginBottom: 30,
        padding: 16,
        backgroundColor: '#FFF5F5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFE5E5',
    },
    logoutText: {
        fontSize: RFPercentage(2),
        fontWeight: '600',
        color: colors.error,
        marginLeft: 8,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: 12,
        width: wp(80),
        padding: 20,
    },
    modalTitle: {
        fontSize: RFPercentage(2.2),
        fontWeight: '700',
        marginBottom: 10,
        color: '#333',
    },
    modalText: {
        fontSize: RFPercentage(2),
        marginBottom: 20,
        color: '#666',
    },
    modalButtons: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderColor: colors.border,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: RFPercentage(2),
    },
});

export default SettingsScreen;