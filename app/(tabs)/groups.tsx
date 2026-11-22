import { View, Text, StyleSheet } from 'react-native';

export default function GroupsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>👥 Groups</Text>
      <Text style={styles.subtitle}>Friends &amp; dues</Text>
      <Text style={styles.placeholder}>
        Group management and balances will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#7C5CFC',
    fontSize: 16,
    marginBottom: 24,
  },
  placeholder: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});
