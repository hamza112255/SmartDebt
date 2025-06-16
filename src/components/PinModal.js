import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;
const MAX_ATTEMPTS = 5;

const colors = {
  primary: '#2563eb',
  white: '#ffffff',
  gray: '#6b7280',
  text: '#1e2937',
  error: '#dc2626',
  background: '#f8fafc',
};

const PinModal = ({
  visible,
  onAuthenticated,
  onCancel,
  title = 'Enter PIN',
  showCancel = true,
  maxAttempts = MAX_ATTEMPTS,
  onEmergencyReset,
  isPinCreationFlow = false,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mode, setMode] = useState(isPinCreationFlow ? 'create' : 'verify');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
      setPin('');
      setConfirmPin('');
      setMode(isPinCreationFlow ? 'create' : 'verify');
      setError('');
      setAttempts(0);
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible, isPinCreationFlow]);

  const handleNumberPress = (num) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let currentPin = mode === 'create' ? pin : mode === 'confirm' ? confirmPin : pin;
    if (currentPin.length < 4) {
      currentPin = currentPin + num;
      if (mode === 'create') {
        setPin(currentPin);
      } else if (mode === 'confirm') {
        setConfirmPin(currentPin);
      } else {
        setPin(currentPin);
      }

      if (currentPin.length === 4) {
        if (mode === 'create') {
          setMode('confirm');
          setConfirmPin('');
        } else if (mode === 'confirm') {
          if (currentPin === pin) {
            onAuthenticated(pin);
            setPin('');
            setConfirmPin('');
            setMode('create');
          } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setError(`PINs do not match (${newAttempts}/${maxAttempts} attempts)`);
            setPin('');
            setConfirmPin('');
            setMode('create');
            if (newAttempts >= maxAttempts && onEmergencyReset) {
              onEmergencyReset();
            }
          }
        } else if (mode === 'verify') {
          onAuthenticated(currentPin);
          setPin('');
        }
      }
    }
  };

  const handleBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (mode === 'confirm') {
      setConfirmPin(confirmPin.slice(0, -1));
    } else {
      setPin(pin.slice(0, -1));
    }
  };

  const handleCancel = () => {
    if (showCancel) {
      setPin('');
      setConfirmPin('');
      setMode(isPinCreationFlow ? 'create' : 'verify');
      setError('');
      setAttempts(0);
      onCancel();
    }
  };

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > BOTTOM_SHEET_HEIGHT * 0.3) {
        translateY.value = withTiming(SCREEN_HEIGHT, {
          duration: 300,
          easing: Easing.in(Easing.cubic),
        });
        handleCancel();
      } else {
        translateY.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <SafeAreaView style={styles.container}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.bottomSheet, animatedStyle]}>
            <View style={styles.dragIndicator} />
            <Text style={styles.title}>
              {mode === 'create' ? title : mode === 'confirm' ? 'Confirm PIN' : 'Enter PIN'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'create' ? 'Enter a 4-digit PIN' :
                mode === 'confirm' ? 'Re-enter your PIN to confirm' :
                  'Enter your 4-digit PIN'}
            </Text>
            <View style={styles.pinContainer}>
              {[...Array(4)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    ((mode === 'create' || mode === 'verify') && i < pin.length) ||
                      (mode === 'confirm' && i < confirmPin.length)
                      ? styles.pinDotFilled
                      : null,
                  ]}
                />
              ))}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.numberPad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'backspace'].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.numberButton,
                    item === '' ? styles.emptyButton : null,
                  ]}
                  onPress={() => {
                    if (item === 'backspace') handleBackspace();
                    else if (item !== '') handleNumberPress(item);
                  }}
                  disabled={item === ''}
                >
                  {item === 'backspace' ? (
                    <Icon name="backspace" size={24} color={colors.text} />
                  ) : (
                    <Text style={styles.numberText}>{item}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.footer}>
              {showCancel && (
                <TouchableOpacity onPress={handleCancel}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
              {onEmergencyReset && mode === 'verify' && (
                <TouchableOpacity onPress={onEmergencyReset}>
                  <Text style={styles.emergencyText}>Forgot PIN? Reset</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </GestureDetector>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    height: BOTTOM_SHEET_HEIGHT,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray,
    borderRadius: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Sora-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Sora-Regular',
  },
  pinContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    justifyContent: 'center',
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray,
    marginHorizontal: 12,
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '80%',
  },
  numberButton: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyButton: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  numberText: {
    fontSize: 24,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Sora-SemiBold',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Sora-Regular',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginTop: 16,
  },
  cancelText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Sora-SemiBold',
  },
  emergencyText: {
    color: colors.error,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Sora-SemiBold',
  },
});

export default PinModal;