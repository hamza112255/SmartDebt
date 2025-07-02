import React from 'react'
import { SafeAreaView, Text, StyleSheet } from 'react-native'

const RecurringTransactionsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text>Recurring Transactions</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RecurringTransactionsScreen
