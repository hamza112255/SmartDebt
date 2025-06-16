import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, SafeAreaView, StatusBar, Alert, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import * as realmModule from '../realm';
import { getAllObjects, updateObject, createObject } from '../realm';
import { useEffect, useState } from 'react';
import uuid from 'react-native-uuid';
import LinearGradient from 'react-native-linear-gradient';

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
        pinCode: ''
    });
    const [userId, setUserId] = useState(null);
    const [showBiometricConfirm, setShowBiometricConfirm] = useState(false);
    const [showPinConfirm, setShowPinConfirm] = useState(false);

    useEffect(() => {
        loadUserData();

        const unsubscribe = navigation.addListener('focus', () => {
            loadUserData();
        });
        return unsubscribe;
    }, [navigation]);

    const loadUserData = () => {
        try {
            const users = getAllObjects('User');
            if (users.length > 0) {
                const u = users[0];
                console.log('Loaded user:', u);
                console.log('Loaded user security settings:', {
                    biometric: u.biometricEnabled,
                    pin: u.pinEnabled
                });
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
                setUserId(u.id);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const section = (title) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    const handleSave = () => {
        const now = new Date();
        if (userId) {
            updateObject('User', userId, {
                ...form,
                updatedOn: now,
                syncStatus: 'pending',
                needsUpload: true,
            });
        } else {
            const newId = uuid.v4();
            createObject('User', {
                id: newId,
                ...form,
                emailConfirmed: form.emailConfirmed,
                biometricEnabled: form.biometricEnabled,
                pinEnabled: form.pinEnabled,
                userType: 'free',
                isActive: true,
                createdOn: now,
                updatedOn: now,
                syncStatus: 'pending',
                lastSyncAt: null,
                needsUpload: true,
            });
            setUserId(newId);
        }
        Alert.alert('Success', 'Profile saved successfully');
    };

    const handleEditProfile = () => {
        navigation.navigate('CreateProfile', {
            mode: 'edit',
            initialValues: {
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email
            },
            onSaveKey: 'settingsScreenRefresh'
        });
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (navigation.getState()?.routes) {
                const currentRoute = navigation.getState().routes[navigation.getState().index];
                if (currentRoute.params?.onSaveKey === 'settingsScreenRefresh') {
                    loadUserData();
                }
            }
        });
        return unsubscribe;
    }, [navigation]);

    const saveUserSettings = async (field, value) => {
        try {
            const users = getAllObjects('User');
            if (users.length === 0) throw new Error('No user record found');
            const userBefore = users[0];
            console.log('Before update:', {
                biometric: userBefore.biometricEnabled,
                pin: userBefore.pinEnabled
            });

            const realm = realmModule.default || realmModule;
            if (realm?.write) {
                realm.write(() => {
                    if (field === 'biometricEnabled') {
                        userBefore.biometricEnabled = value;
                    } else if (field === 'pinEnabled') {
                        userBefore.pinEnabled = value;
                        if (!value) userBefore.pinCode = '';
                    }
                    userBefore.updatedOn = new Date();
                });

                const updatedUser = getAllObjects('User')[0];
                console.log('After update:', {
                    biometric: updatedUser.biometricEnabled,
                    pin: updatedUser.pinEnabled
                });
                return true;
            }

            const updateData = {
                updatedOn: new Date(),
                [field]: value,
                ...(field === 'pinEnabled' && !value ? { pinCode: '' } : {})
            };
            await updateObject('User', userId, updateData);
            console.log('Used updateObject fallback');
            return true;

        } catch (error) {
            console.error('Save failed:', {
                field,
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    };

    const toggleBiometric = async (val) => {
        setShowBiometricConfirm(false);
        const prevValue = form.biometricEnabled;
        updateField('biometricEnabled', val);
        const success = await saveUserSettings('biometricEnabled', val);
        if (!success) updateField('biometricEnabled', prevValue);
    };

    const togglePin = async (val) => {
        setShowPinConfirm(false);
        const prevValue = form.pinEnabled;
        updateField('pinEnabled', val);
        const success = await saveUserSettings('pinEnabled', val);
        if (!success) updateField('pinEnabled', prevValue);
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
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={RFPercentage(3)} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: RFPercentage(3) }} />
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.contentWrapper}>
                {section('Personal Information')}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(2) }}>
                    <View style={{ flexDirection: 'row', flex: 1 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>First Name</Text>
                            <Text style={styles.readonlyValue}>{form.firstName || 'Not set'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Last Name</Text>
                            <Text style={styles.readonlyValue}>{form.lastName || 'Not set'}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleEditProfile} style={styles.editBtn}>
                        <Icon name="edit" size={RFPercentage(2.5)} color={colors.primary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.readonlyGroup}>
                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.readonlyValue}>{form.email || 'Not set'}</Text>
                </View>
                <View style={styles.readonlyGroup}>
                    <Text style={styles.label}>Language</Text>
                    <Text style={styles.readonlyValue}>{form.language}</Text>
                </View>

                {section('Security')}
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Biometric Enabled</Text>
                    <Switch
                        value={form.biometricEnabled}
                        onValueChange={(val) => setShowBiometricConfirm(true)}
                        thumbColor={form.biometricEnabled ? colors.primary : colors.lightGray}
                    />
                </View>
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>PIN Enabled</Text>
                    <Switch
                        value={form.pinEnabled}
                        onValueChange={(val) => setShowPinConfirm(true)}
                        thumbColor={form.pinEnabled ? colors.primary : colors.lightGray}
                    />
                </View>

                <Modal visible={showBiometricConfirm} transparent={true}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Confirm Change</Text>
                            <Text style={styles.modalText}>Are you sure you want to {form.biometricEnabled ? 'disable' : 'enable'} biometric authentication?</Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { borderRightWidth: 1, borderColor: colors.border }]}
                                    onPress={() => setShowBiometricConfirm(false)}
                                >
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => toggleBiometric(!form.biometricEnabled)}
                                >
                                    <Text style={[styles.modalButtonText, { color: colors.primary }]}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <Modal visible={showPinConfirm} transparent={true}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Confirm Change</Text>
                            <Text style={styles.modalText}>Are you sure you want to {form.pinEnabled ? 'disable' : 'enable'} PIN authentication?</Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { borderRightWidth: 1, borderColor: colors.border }]}
                                    onPress={() => setShowPinConfirm(false)}
                                >
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => togglePin(!form.pinEnabled)}
                                >
                                    <Text style={[styles.modalButtonText, { color: colors.primary }]}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {form.pinEnabled && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PIN Code</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.lightGray }]}
                            placeholder="Enter 4-6 digit PIN"
                            value={form.pinCode}
                            editable={false}
                            keyboardType="number-pad"
                            secureTextEntry
                            maxLength={6}
                            placeholderTextColor={colors.gray}
                        />
                    </View>
                )}
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
        justifyContent: 'space-between',
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
        fontSize: RFPercentage(2.0),
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
});

export default SettingsScreen;