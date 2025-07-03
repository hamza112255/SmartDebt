import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue, RFPercentage } from 'react-native-responsive-fontsize';
import Icon from 'react-native-vector-icons/MaterialIcons';

const colors = {
    primary: '#667eea',
    border: '#E5E5E5',
    activeBorder: '#667eea',
    textPrimary: '#2d3748',
    textSecondary: '#718096',
    error: '#f56565',
    white: '#fff',
    lightBackground: '#FAFAFA',
};

const StyledTextInput = ({ label, value, onChangeText, onFocus, onBlur, error, icon, isPassword, rightComponent, leftSymbol, currency, onCurrencyChange, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
            {label && <Text style={styles.label}>{label}</Text>}
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
        marginBottom: 20,
    },
    label: {
        fontSize: RFPercentage(1.8),
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.lightBackground,
        minHeight: 50, 
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
        fontSize: RFPercentage(1.8),
        color: colors.textPrimary,
        paddingVertical: 12,
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