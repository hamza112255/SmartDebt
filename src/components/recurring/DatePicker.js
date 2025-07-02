import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import moment from 'moment';

const DatePicker = ({ label, value, onChange, minimumDate, placeholder = "Select a date" }) => {
  const [showPicker, setShowPicker] = useState(false);
  const dateValue = value ? new Date(value) : null;

  const onDateChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.inputContainer} onPress={() => setShowPicker(true)}>
        <Calendar size={20} color="#666" />
        <Text style={[styles.inputText, !dateValue && styles.placeholderText]}>
          {dateValue ? moment(dateValue).format('ddd, MMM DD, YYYY') : placeholder}
        </Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={dateValue || new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={minimumDate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        gap: 8,
    },
    inputText: {
        fontSize: 16,
        color: '#333',
    },
    placeholderText: {
        color: '#999',
    }
});

export default DatePicker; 