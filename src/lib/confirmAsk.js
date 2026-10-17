import { Alert } from 'react-native';

// "Are you sure?" as a promise: resolves true on the confirm button, false on Cancel.
// Every Approve / Reject goes through this before it acts.
export function confirmAsk(title, message, confirmText = 'Confirm', destructive = false) {
  return new Promise((resolve) => Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}
