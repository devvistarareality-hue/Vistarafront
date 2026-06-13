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
    width: width * 0.5,
    height: width * 0.5,
    // marginBottom: height * 0.02,
  },
  
  companyCodeBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.05,
    borderRadius: SIZES.radius,
    marginBottom: height * 0.04,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  companyCodeLabel: {
    fontSize: width * 0.037,
    color: COLORS.text,
    marginRight: width * 0.02,
  },
  companyCodeValue: {
    fontSize: width * 0.037,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  inputContainer: {
    width: '100%',
    marginBottom: height * 0.02,
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
    height: height * 0.06,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: width * 0.04,
    fontSize: width * 0.042,
    color: COLORS.text,
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
    alignItems:'center',
    justifyContent:'center'
  },
  passwordInput: {
    width: '100%',
    height: height * 0.06,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: width * 0.04,
    paddingRight: width * 0.13,
    fontSize: width * 0.042,
    color: COLORS.text,
  },
  eyeIcon: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: height * 0.06,
    width: width * 0.10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIconText: {
    fontSize: width * 0.063,
  },
  loginButton: {
    width: '100%',
    height: height * 0.05,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.015,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: height * 0.0025 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.lightGray,
    elevation: 0,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: width * 0.047,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: height * 0.025,
    paddingVertical: height * 0.015,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: width * 0.042,
    fontWeight: '600',
  },
});

export default styles;