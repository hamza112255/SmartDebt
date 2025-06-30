import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BiometricModal = ({ visible, onAuthenticated }) => {
    useEffect(() => {
        if (visible) {
            authenticate();
        }
    }, [visible]);

    const authenticate = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to access SmartDebt',
                fallbackLabel: 'Use Passcode',
            });

            if (result.success) {
                await SecureStore.setItemAsync('lastAuthTime', Date.now().toString());
                onAuthenticated();
            } else {
                Alert.alert('Authentication Failed', 'Please try again.', [
                    { text: 'Retry', onPress: authenticate },
                ]);
            }
        } catch (error) {
            console.error('Authentication error:', error);
            Alert.alert('Error', 'An error occurred during authentication', [
                { text: 'Retry', onPress: authenticate },
            ]);
        }
    };

    return null;
};

export default BiometricModal;