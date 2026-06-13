// import { StyleSheet } from 'react-native';
// import { COLORS, SIZES } from '../../constants/theme';

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: COLORS.background,
//   },
//   header: {
//     backgroundColor: COLORS.white,
//     paddingVertical: SIZES.padding * 2,
//     paddingHorizontal: SIZES.padding,
//     alignItems: 'center',
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.lightGray,
//   },
//   headerTitle: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: COLORS.primary,
//     marginBottom: 8,
//   },
//   headerSubtitle: {
//     fontSize: 16,
//     color: COLORS.text,
//   },
//   content: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: SIZES.padding,
//   },
//   welcomeText: {
//     fontSize: 18,
//     color: COLORS.text,
//     textAlign: 'center',
//     marginBottom: 32,
//   },
//   button: {
//     backgroundColor: COLORS.primary,
//     paddingVertical: 16,
//     paddingHorizontal: 48,
//     borderRadius: SIZES.radius,
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   buttonText: {
//     color: COLORS.white,
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });

// export default styles;


import { StyleSheet, Dimensions } from 'react-native';
import { COLORS, SIZES } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.06,
    paddingVertical: height * 0.03,
  },
  logo: {
    width: width * 0.48,
    height: width * 0.48,
    marginBottom: height * 0.03,
  },
  title: {
    fontSize: width * 0.085,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: height * 0.01,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: width * 0.042,
    color: COLORS.text,
    marginBottom: height * 0.05,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: height * 0.03,
  },
  label: {
    fontSize: width * 0.037,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: height * 0.01,
    marginLeft: width * 0.01,
  },
  input: {
    width: '100%',
    height: height * 0.07,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: width * 0.04,
    fontSize: width * 0.042,
    color: COLORS.text,
  },
  submitButton: {
    width: '100%',
    height: height * 0.07,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: height * 0.0025 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.lightGray,
    elevation: 0,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: width * 0.047,
    fontWeight: 'bold',
  },
});

export default styles;