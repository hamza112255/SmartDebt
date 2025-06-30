import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import Icon from 'react-native-vector-icons/MaterialIcons';

const colors = {
    primary: '#667eea',
    border: '#e2e8f0',
    activeBorder: '#667eea',
    textPrimary: '#2d3748',
    textSecondary: '#718096',
    error: '#f56565',
    white: '#fff',
};

const StyledTextInput = ({ label, value, onChangeText, onFocus, onBlur, error, icon, isPassword, rightComponent, leftSymbol, currency, onCurrencyChange, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    
    const shouldFloat = isFocused || (value && value.length > 0);
    const floatAnim = useRef(new Animated.Value(shouldFloat ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(floatAnim, {
            toValue: shouldFloat ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [shouldFloat]);

    const labelStyle = {
        position: 'absolute',
        left: wp('3%'),
        backgroundColor: colors.white,
        paddingHorizontal: 4,
        zIndex: 1,
        fontSize: RFValue(12),
        color: colors.primary,
        opacity: floatAnim,
        transform: [{
            translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [hp('3%'), -hp('1.5%')],
            })
        }]
    };

    const handleFocus = (e) => {
        setIsFocused(true);
        if (onFocus) onFocus(e);
    };

    const handleBlur = (e) => {
        setIsFocused(false);
        if (onBlur) onBlur(e);
    };

    return (
        <View style={styles.container}>
            <Animated.Text style={labelStyle}>
                {label}
            </Animated.Text>
            <View style={[styles.inputContainer, { borderColor: isFocused ? colors.activeBorder : error ? colors.error : colors.border }]}>
                {leftSymbol && <Text style={styles.leftSymbol}>{leftSymbol}</Text>}
                {icon && !leftSymbol && <Icon name={icon} size={20} color={isFocused ? colors.primary : colors.textSecondary} style={styles.icon} />}
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    secureTextEntry={isPassword && !isPasswordVisible}
                    placeholderTextColor={colors.textSecondary}
                    {...props}
                />
                {isPassword && (
                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                        <Icon name={isPasswordVisible ? 'visibility' : 'visibility-off'} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
                {currency && (
                    <View style={styles.currencyContainer}>
                        <Text style={styles.currencyText}>{currency}</Text>
                    </View>
                )}
                {rightComponent}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: hp('3%'),
        position: 'relative',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 8,
        paddingHorizontal: wp('3%'),
        height: hp('7%'),
        backgroundColor: '#fff',
    },
    icon: {
        marginRight: wp('2%'),
    },
    leftSymbol: {
        fontSize: RFValue(18),
        color: colors.primary,
        marginRight: wp('2%'),
        fontWeight: 'bold',
    },
    input: {
        flex: 1,
        fontSize: RFValue(16),
        color: colors.textPrimary,
    },
    errorText: {
        color: colors.error,
        fontSize: RFValue(12),
        marginTop: hp('0.5%'),
        marginLeft: wp('1%'),
    },
    eyeIcon: {
        padding: 5,
    },
    currencyContainer: {
        paddingHorizontal: wp('3%'),
        borderLeftWidth: 1,
        borderLeftColor: colors.border,
        justifyContent: 'center',
    },
    currencyText: {
        fontSize: RFValue(16),
        color: colors.primary,
        fontWeight: 'bold',
    }
});

export default StyledTextInput; 