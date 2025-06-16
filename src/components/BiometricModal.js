import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const colors = {
    primary: '#2563eb',
    white: '#ffffff',
    gray: '#6b7280',
    text: '#1f2937',
    error: '#dc2626',
};

const BiometricModal = ({ visible, onAuthenticated }) => {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        console.log('BiometricModal mounted, visible:', visible);
        if (visible) {
            authenticate();
        }
    }, [visible]);

    const authenticate = async () => {
        console.log('Attempting biometric authentication...');
        setIsLoading(true);
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to access SmartDebt',
                fallbackLabel: 'Use Passcode',
            });

            if (result.success) {
                console.log('Biometric authentication successful');
                await SecureStore.setItemAsync('lastAuthTime', Date.now().toString());
                onAuthenticated();
            } else {
                console.log('Biometric authentication failed');
                Alert.alert('Authentication Failed', 'Please try again.', [
                    { text: 'Retry', onPress: authenticate },
                ]);
            }
        } catch (error) {
            console.error('Authentication error:', error);
            Alert.alert('Error', 'An error occurred during authentication', [
                { text: 'Retry', onPress: authenticate },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    console.log('Rendering BiometricModal, visible:', visible, 'isLoading:', isLoading);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => console.log('Modal close requested, ignored')}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.logoContainer}>
                        <Icon name="account-balance-wallet" size={48} color={colors.primary} />
                    </View>
                    <Text style={styles.title}>SmartDebt Authentication</Text>
                    <Text style={styles.subtitle}>Please use your fingerprint to continue</Text>
                    <TouchableOpacity
                        style={[styles.authButton, isLoading && styles.buttonDisabled]}
                        onPress={authenticate}
                        disabled={isLoading}
                    >
                        <Icon name="fingerprint" size={20} color={colors.white} style={{ marginRight: 8 }} />
                        <Text style={styles.buttonText}>
                            {isLoading ? 'Authenticating...' : 'Authenticate'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 24,
        width: '80%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.gray,
        marginBottom: 24,
        textAlign: 'center',
    },
    authButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        height: 52,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.white,
    },
});

export default BiometricModal;