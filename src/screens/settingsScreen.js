import React, { useEffect, useState, useContext } from 'react';
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
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { RFPercentage } from 'react-native-responsive-fontsize';
import { getAllObjects, updateObject, createObject, initializeRealm, realm } from '../realm';
import uuid from 'react-native-uuid';
import LinearGradient from 'react-native-linear-gradient';
import BiometricContext from '../../src/contexts/BiometricContext';
import { supabase } from '../supabase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PinModal from '../components/PinModal';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next'; // Import useTranslation

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
    const [showBiometricConfirm, setShowBiometricConfirm] = useState(false);
    const [showPinSetup, setShowPinSetup] = useState(false);
    const { updateBiometricState, updatePinState } = useContext(BiometricContext);
    const { t } = useTranslation(); // Initialize useTranslation
    const [userType, setUserType] = useState('free'); // Default user type

    useEffect(() => {
        loadUserData();
        const unsubscribe = navigation.addListener('focus', loadUserData);
        return unsubscribe;
    }, [navigation]);

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
                setUserType(u.userType || 'free'); // Set user type from realm data
                setUserId(u.id);
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('settingsScreen.errors.loadUser'));
        }
    };

    const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const saveSettings = async (settingsToUpdate) => {
        if (!userId) {
            Alert.alert(t('common.error'), t('settingsScreen.errors.noUserFound'));
            return false;
        }
        try {
            realm.write(() => {
                realm.create('User', {
                    id: userId,
                    ...settingsToUpdate,
                    updatedOn: new Date(),
                }, 'modified');

                // Check if a 'create' log already exists for this unsynced user.
                const createLog = realm.objects('SyncLog').filtered('recordId == $0 AND operation == "create" AND (status == "pending" OR status == "failed")', userId)[0];
                
                if (!createLog) {
                    // Only create an 'update' log if the user record has been synced before.
                    realm.create('SyncLog', {
                        id: `${Date.now()}_log`,
                        userId: userId,
                        tableName: 'users',
                        recordId: userId,
                        operation: 'update',
                        status: 'pending',
                        createdOn: new Date(),
                    });
                }
            });

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
            Alert.alert(t('common.error'), t('settingsScreen.errors.saveSettings'));
            return false;
        }
    };

    const handleEditProfile = () => {
        Alert.alert(t('settingsScreen.confirm.editProfileTitle'), t('settingsScreen.confirm.editProfileMessage'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('settingsScreen.buttons.proceed'), onPress: () => navigation.navigate('CreateProfile', {
                mode: 'edit',
                initialValues: {
                    firstName: form.firstName,
                    lastName: form.lastName,
                    email: form.email,
                },
                onSaveKey: 'settingsScreenRefresh',
            }) }
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
        updateField('pinEnabled', value);
        if (value) {
            // If enabling PIN and one already exists, just save. Otherwise, show setup.
            if (form.pinCode) {
                await saveSettings({ pinEnabled: true });
            } else {
                setShowPinSetup(true);
            }
        } else {
            // Disabling PIN
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
        const prevValue = form.biometricEnabled;
        updateField('biometricEnabled', val);
        const success = await saveSettings({ biometricEnabled: val });
        if (!success) {
            updateField('biometricEnabled', prevValue); // Revert on failure
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
            <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <Text style={styles.headerTitle}>{t('settingsScreen.title')}</Text>
                <View style={{ width: RFPercentage(3) }} />
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.contentWrapper}>
                <Text style={styles.sectionHeader}>{t('settingsScreen.sections.profile')}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(2) }}>
                    <View style={{ flexDirection: 'row', flex: 1 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>{t('settingsScreen.labels.firstName')}</Text>
                            <Text style={styles.readonlyValue}>{form.firstName || t('common.notSet')}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>{t('settingsScreen.labels.lastName')}</Text>
                            <Text style={styles.readonlyValue}>{form.lastName || t('common.notSet')}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleEditProfile} style={styles.editBtn}>
                        <Icon name="edit" size={hp(3)} color={colors.primary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.readonlyGroup}>
                    <Text style={styles.label}>{t('settingsScreen.labels.emailAddress')}</Text>
                    <Text style={styles.readonlyValue}>{form.email || t('common.notSet')}</Text>
                </View>
                <View style={styles.readonlyGroup}>
                    <Text style={styles.label}>{t('settingsScreen.labels.language')}</Text>
                    <Text style={styles.readonlyValue}>{t(`languages.${form.language.toLowerCase()}`)}</Text>
                </View>

                <Text style={styles.sectionHeader}>{t('settingsScreen.sections.security')}</Text>
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>{t('settingsScreen.labels.enableBiometric')}</Text>
                    <Switch
                        value={form.biometricEnabled}
                        onValueChange={() => setShowBiometricConfirm(true)}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.white}
                    />
                </View>
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>{t('settingsScreen.labels.enablePin')}</Text>
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
                    <Text style={[styles.changePinText, !form.pinEnabled && styles.disabledText]}>{t('settingsScreen.buttons.changePin')}</Text>
                </TouchableOpacity>

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

                <PinModal
                    visible={showPinSetup}
                    onAuthenticated={handlePinSetupComplete}
                    onCancel={() => {
                        setShowPinSetup(false);
                        setForm((prev) => ({ ...prev, pinEnabled: false }));
                    }}
                    title={t('settingsScreen.modals.setupPinTitle')}
                    isPinCreationFlow={true}
                />

                {form.pinEnabled && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('settingsScreen.labels.pinCode')}</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.lightGray }]}
                            placeholder={t('settingsScreen.placeholders.pinNotSet')}
                            value={form.pinCode}
                            editable={false}
                            keyboardType="number-pad"
                            secureTextEntry
                            maxLength={4}
                            placeholderTextColor={colors.gray}
                        />
                    </View>
                )}
                {/* Logout Button */}
                {userType === 'paid' && <TouchableOpacity
                    style={{
                        marginTop: 30,
                        padding: 15,
                        backgroundColor: colors.error,
                        borderRadius: 8,
                        alignItems: 'center',
                    }}
                    onPress={async () => {
                        try {
                            await supabase.auth.signOut();
                            // Optionally clear local user state here if needed
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        } catch (error) {
                            Alert.alert(t('common.error'), error.message || 'Logout failed');
                        }
                    }}
                >
                    <Text style={{ color: colors.white, fontSize: RFPercentage(2.2), fontFamily: 'Sora-Bold' }}>
                        {t('common.logout') || 'Logout'}
                    </Text>
                </TouchableOpacity>}
            </ScrollView>
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
        justifyContent: 'center',
        paddingVertical: hp(2),
        paddingHorizontal: wp(4.5),
    },
    headerTitle: {
        fontSize: RFPercentage(2.5),
        color: colors.white,
        fontFamily: 'Sora-Bold',
    },
    contentWrapper: {
        padding: wp(4.5),
    },
    inputGroup: {
        marginBottom: hp(2),
    },
    label: {
        fontSize: RFPercentage(2),
        marginBottom: hp(0.8),
        color: colors.text,
        fontFamily: 'Sora-SemiBold',
    },
    input: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: wp(2),
        paddingHorizontal: wp(3),
        paddingVertical: hp(1.2),
        fontSize: RFPercentage(2),
        color: colors.text,
    },
    readonlyGroup: {
        marginBottom: hp(2),
    },
    readonlyValue: {
        fontSize: RFPercentage(2),
        color: colors.gray,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: hp(1.5),
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    switchLabel: {
        fontSize: RFPercentage(2),
        color: colors.text,
    },
    sectionHeader: {
        fontSize: RFPercentage(2.2),
        color: colors.primary,
        fontFamily: 'Sora-Bold',
        marginTop: hp(2),
        marginBottom: hp(1),
    },
    editBtn: {
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.5),
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: wp(2),
        width: wp(80),
        padding: wp(5),
    },
    modalTitle: {
        fontSize: RFPercentage(2.5),
        fontFamily: 'Sora-Bold',
        marginBottom: hp(1),
        color: colors.text,
    },
    modalText: {
        fontSize: RFPercentage(2),
        marginBottom: hp(2),
        color: colors.text,
    },
    modalButtons: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderColor: colors.border,
    },
    modalButton: {
        flex: 1,
        paddingVertical: hp(1.5),
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: RFPercentage(2),
    },
    changePinButton: {
        marginTop: hp(2),
        padding: hp(1.5),
        backgroundColor: colors.white,
        borderRadius: wp(2),
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
        fontSize: RFPercentage(2),
        fontFamily: 'Sora-SemiBold',
    },
    disabledText: {
        color: colors.gray,
    },
});

export default SettingsScreen;