import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Repeat, Calendar, Hash } from 'lucide-react-native';
import DatePicker from './DatePicker';


const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function RecurringForm({ 
  onSubmit, 
  onCancel, 
  initialData 
}) {
  const [formData, setFormData] = useState(() => {
    return {
      frequency_type: initialData?.frequency_type || 'monthly',
      interval_value: initialData?.interval_value || 1,
      start_date: initialData?.start_date ? new Date(initialData.start_date) : new Date(),
      end_date: initialData?.end_date ? new Date(initialData.end_date) : undefined,
      max_occurrences: initialData?.max_occurrences,
      end_condition: initialData?.end_condition || 'never',
    }
  });

  const handleSubmit = () => {
    // Validation
    if (formData.interval_value < 1) {
      Alert.alert('Error', 'Interval must be at least 1');
      return;
    }

    if (formData.end_condition === 'date' && !formData.end_date) {
      Alert.alert('Error', 'Please select an end date');
      return;
    }

    if (formData.end_condition === 'occurrences' && (!formData.max_occurrences || formData.max_occurrences < 1)) {
      Alert.alert('Error', 'Please enter a valid number of occurrences');
      return;
    }

    if (formData.end_date && formData.end_date <= formData.start_date) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    // Format dates for JSON serialization
    const formattedData = {
      ...formData,
      start_date: formData.start_date.toISOString(),
      end_date: formData.end_date ? formData.end_date.toISOString() : undefined,
      // Convert interval_value to number
      interval_value: parseInt(formData.interval_value, 10),
      // Convert max_occurrences to number if it exists
      max_occurrences: formData.max_occurrences ? parseInt(formData.max_occurrences, 10) : undefined
    };

    onSubmit(formattedData);
  };

  const getFrequencyLabel = () => {
    const interval = formData.interval_value;
    const frequency = formData.frequency_type;
    
    if (interval === 1) {
      return frequency.charAt(0).toUpperCase() + frequency.slice(1);
    }
    
    const pluralMap = {
      daily: 'days',
      weekly: 'weeks', 
      monthly: 'months',
      yearly: 'years'
    };
    
    return `Every ${interval} ${pluralMap[frequency]}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Repeat size={24} color="#007AFF" />
        <Text style={styles.title}>Recurring Transaction</Text>
      </View>

      {/* Frequency Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequency</Text>
        <View style={styles.frequencyGrid}>
          {FREQUENCY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.frequencyOption,
                formData.frequency_type === option.value && styles.frequencyOptionSelected
              ]}
              onPress={() => setFormData(prev => ({ ...prev, frequency_type: option.value }))}
            >
              <Text style={[
                styles.frequencyText,
                formData.frequency_type === option.value && styles.frequencyTextSelected
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Interval */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Repeat Every</Text>
        <View style={styles.intervalContainer}>
          <TextInput
            style={styles.intervalInput}
            value={formData.interval_value.toString()}
            onChangeText={(text) => {
              const value = parseInt(text) || 1;
              setFormData(prev => ({ ...prev, interval_value: Math.max(1, value) }));
            }}
            keyboardType="numeric"
            maxLength={3}
          />
          <Text style={styles.intervalLabel}>
            {formData.frequency_type}
            {formData.interval_value !== 1 ? 's' : ''}
          </Text>
        </View>
        <Text style={styles.previewText}>{getFrequencyLabel()}</Text>
      </View>

      {/* Start Date */}
      <View style={styles.section}>
        <DatePicker
          label="Start Date"
          value={formData.start_date}
          onChange={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
          minimumDate={new Date()}
        />
      </View>

      {/* End Condition */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>End Condition</Text>
        
        <TouchableOpacity
          style={styles.endOption}
          onPress={() => setFormData(prev => ({ 
            ...prev, 
            end_condition: 'never',
            end_date: undefined,
            max_occurrences: undefined
          }))}
        >
          <View style={styles.radioContainer}>
            <View style={[
              styles.radio,
              formData.end_condition === 'never' && styles.radioSelected
            ]} />
            <Text style={styles.endOptionText}>Never end</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endOption}
          onPress={() => setFormData(prev => ({ 
            ...prev, 
            end_condition: 'date',
            max_occurrences: undefined
          }))}
        >
          <View style={styles.radioContainer}>
            <View style={[
              styles.radio,
              formData.end_condition === 'date' && styles.radioSelected
            ]} />
            <Text style={styles.endOptionText}>End by date</Text>
          </View>
        </TouchableOpacity>

        {formData.end_condition === 'date' && (
          <View style={styles.endDateContainer}>
            <DatePicker
              label=""
              value={formData.end_date}
              onChange={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
              minimumDate={new Date(formData.start_date.getTime() + 24 * 60 * 60 * 1000)}
              placeholder="Select end date"
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.endOption}
          onPress={() => setFormData(prev => ({ 
            ...prev, 
            end_condition: 'occurrences',
            end_date: undefined
          }))}
        >
          <View style={styles.radioContainer}>
            <View style={[
              styles.radio,
              formData.end_condition === 'occurrences' && styles.radioSelected
            ]} />
            <Text style={styles.endOptionText}>End after number of occurrences</Text>
          </View>
        </TouchableOpacity>

        {formData.end_condition === 'occurrences' && (
          <View style={styles.occurrencesContainer}>
            <Hash size={20} color="#666" />
            <TextInput
              style={styles.occurrencesInput}
              placeholder="Number of times"
              value={formData.max_occurrences?.toString() || ''}
              onChangeText={(text) => {
                const value = parseInt(text) || undefined;
                setFormData(prev => ({ ...prev, max_occurrences: value }));
              }}
              keyboardType="numeric"
              maxLength={4}
            />
            <Text style={styles.occurrencesLabel}>times</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Save Recurring</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyOption: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    alignItems: 'center',
  },
  frequencyOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  frequencyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  frequencyTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  intervalInput: {
    width: 80,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  intervalLabel: {
    fontSize: 16,
    color: '#666',
  },
  previewText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '500',
  },
  endOption: {
    marginBottom: 12,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  endOptionText: {
    fontSize: 16,
    color: '#333',
  },
  endDateContainer: {
    marginLeft: 32,
    marginTop: 8,
  },
  occurrencesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 32,
    marginTop: 8,
    gap: 8,
  },
  occurrencesInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    fontSize: 16,
  },
  occurrencesLabel: {
    fontSize: 16,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 