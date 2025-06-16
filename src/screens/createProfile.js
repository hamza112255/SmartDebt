import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { getAllObjects, createObject, updateObject } from '../realm';
import uuid from 'react-native-uuid';

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
};

export default function CreateProfileScreen({ navigation, route }) {
    const { mode = 'create', initialValues = {}, onSaveKey } = route.params || {}; // mode: 'create' | 'edit'

    const existingUser = (() => {
        const users = getAllObjects('User');
        return users.length > 0 ? users[0] : null;
    })();

    const [form, setForm] = useState({
        firstName: existingUser?.firstName || '',
        lastName: existingUser?.lastName || '',
        email: existingUser?.email || '',
    });

    useEffect(() => {
        if (mode === 'edit') {
            setForm({
                firstName: initialValues.firstName || '',
                lastName: initialValues.lastName || '',
                email: initialValues.email || ''
            });
        }
    }, [mode, initialValues]);

    // auto-detect timezone when creating new user
    const deviceTimezone = Intl?.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSave = () => {
        const { firstName, lastName, email } = form;
        
        // Required field validation
        if (!firstName.trim()) {
            Alert.alert('Error', 'First name is required');
            return;
        }
        if (!lastName.trim()) {
            Alert.alert('Error', 'Last name is required');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Error', 'Email is required');
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            Alert.alert('Error', 'Please enter a valid email');
            return;
        }
        const now = new Date();
        if (existingUser && mode === 'edit') {
            updateObject('User', existingUser.id, {
                ...existingUser,
                ...form,
                timezone: deviceTimezone,
                updatedOn: now,
                syncStatus: 'pending',
                needsUpload: true,
            });
        } else {
            const newId = uuid.v4();
            createObject('User', {
                id: newId,
                ...form,
                timezone: deviceTimezone,
                language: 'English',
                userType: 'free',
                emailConfirmed: false,
                biometricEnabled: false,
                pinEnabled: false,
                pinCode: '',
                isActive: true,
                createdOn: now,
                updatedOn: now,
                syncStatus: 'pending',
                lastSyncAt: null,
                needsUpload: true,
            });
        }

        if (onSaveKey) {
            navigation.goBack();
        } else {
            navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ alignItems: 'center', paddingBottom: hp(7.5) }}
            >
                <View style={[styles.header, { paddingHorizontal: wp(4.5) }]}>
                    {mode === 'edit' && (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="arrow-back" size={RFValue(22)} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.headerTitle}>{mode === 'edit' ? 'Edit Profile' : 'Create Profile'}</Text>
                </View>
                <View style={[styles.formWrapper, { maxWidth: wp(90), width: '100%' }]}>
                    {/* First Name */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>First Name</Text>
                        <View style={styles.inputWrapper}>
                            <Icon name="person-outline" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={form.firstName}
                                onChangeText={text => updateField('firstName', text)}
                                placeholder="First Name"
                                placeholderTextColor={colors.gray}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>
                    {/* Last Name */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Last Name</Text>
                        <View style={styles.inputWrapper}>
                            <Icon name="person-outline" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={form.lastName}
                                onChangeText={text => updateField('lastName', text)}
                                placeholder="Last Name"
                                placeholderTextColor={colors.gray}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>
                    {/* Email */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <Icon name="email" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={form.email}
                                onChangeText={text => updateField('email', text)}
                                placeholder="Email"
                                placeholderTextColor={colors.gray}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(2),
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        width: '100%',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: RFPercentage(2.8),
        fontFamily: 'Sora-Bold',
        color: colors.primary,
        flex: 1,
        textAlign: 'center',
    },
    formWrapper: {
        width: '100%',
        alignSelf: 'center',
        marginTop: hp(3),
        paddingHorizontal: wp(4.5),
    },
    inputContainer: {
        marginBottom: hp(2.25),
        width: '100%',
    },
    label: {
        fontSize: RFPercentage(2),
        fontFamily: 'Sora-SemiBold',
        color: colors.gray,
        marginBottom: hp(1),
    },
    inputWrapper: {
        backgroundColor: colors.white,
        borderRadius: wp(3),
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) },
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: wp(3),
    },
    inputIcon: {
        marginRight: wp(3),
    },
    input: {
        flex: 1,
        paddingVertical: hp(1.75),
        fontSize: RFPercentage(2.2),
        fontFamily: 'Sora-Regular',
        color: colors.text,
    },
    buttonContainer: {
        marginTop: hp(1.5),
        marginBottom: hp(3),
        width: '100%',
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: wp(3),
        paddingVertical: hp(1.75),
        paddingHorizontal: wp(8),
        alignItems: 'center',
        width: '100%',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: hp(0.25) },
    },
    saveButtonText: {
        color: colors.white,
        fontSize: RFPercentage(2.2),
        fontFamily: 'Sora-Bold',
        textAlign: 'center',
    },
    backBtn: {
        paddingRight: wp(3),
    },
});
