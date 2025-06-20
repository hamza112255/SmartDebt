import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase';

const colors = {
    primary: '#2563eb',
    background: '#f8fafc',
    white: '#ffffff',
    gray: '#6b7280',
    lightGray: '#f3f4f6',
    text: '#1f2937',
    border: '#e5e7eb',
    error: '#dc2626',
};

const ForgotPasswordScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation();

    const handlePasswordReset = async () => {
        if (!email.trim()) {
            Alert.alert(t('common.error'), t('loginScreen.validation.emailRequired'));
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'myapp://auth/callback',
            });
            if (error) throw error;
            Alert.alert('Password Reset Sent', 'Please check your email for a password reset link.');
            navigation.goBack();
        } catch (error) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={RFValue(24)} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Forgot Password</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.subtitle}>Enter your email address and we'll send you a link to reset your password.</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email Address</Text>
                    <View style={styles.inputWrapper}>
                        <Icon name="email" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor={colors.gray}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>
                <TouchableOpacity style={[styles.submitButton, isLoading && styles.buttonDisabled]} onPress={handlePasswordReset} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
                </TouchableOpacity>
            </View>
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
        paddingHorizontal: wp(4),
        paddingVertical: hp(2),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: wp(2),
    },
    title: {
        fontSize: RFPercentage(2.8),
        fontWeight: 'bold',
        color: colors.text,
        marginLeft: wp(4),
    },
    content: {
        flex: 1,
        paddingHorizontal: wp(6),
        paddingTop: hp(4),
    },
    subtitle: {
        fontSize: RFPercentage(2.2),
        color: colors.gray,
        textAlign: 'center',
        marginBottom: hp(4),
    },
    inputContainer: {
        marginBottom: hp(2.5),
    },
    label: {
        fontSize: RFPercentage(2),
        fontWeight: '600',
        color: colors.text,
        marginBottom: hp(1),
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.lightGray,
        borderRadius: wp(3),
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: wp(4),
        height: hp(6.5),
    },
    inputIcon: {
        marginRight: wp(3),
    },
    input: {
        flex: 1,
        fontSize: RFPercentage(2.2),
        color: colors.text,
        height: '100%',
    },
    submitButton: {
        backgroundColor: colors.primary,
        borderRadius: wp(3),
        height: hp(6.5),
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: hp(2),
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: RFPercentage(2.2),
        fontWeight: '600',
        color: colors.white,
    },
});

export default ForgotPasswordScreen;
