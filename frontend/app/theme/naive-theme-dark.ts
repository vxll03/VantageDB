import type { GlobalThemeOverrides } from 'naive-ui';

export const naiveThemeOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: '"Inter", sans-serif',
    primaryColor: '#11af74',
    primaryColorHover: '#14c985',
    primaryColorPressed: '#0e8e5e',
    textColorBase: '#ffffff',
    textColor2: '#737573',
    bodyColor: '#040E07',
    cardColor: '#1A1E1B',
    dividerColor: '#2C3333',
    borderRadius: '4px',
  },
  Card: {
    color: '#131613',
    borderColor: '#1A1E1B',
    textColor: '#ffffff',
    borderRadius: '12px',
    titleTextColor: '#737573',
    titleFontWeight: '400',
    titleFontSizeMedium: '12px',
    colorModal: '#1E2320',
    borderColorModal: '#1A1E1B',
  },
  Input: {
    color: '#0A110D',
    colorFocus: '#0A110D',
    textColor: '#ffffff',
    border: '2px solid #1A1E1B',
    borderHover: '2px solid #11af74',
    borderFocus: '2px solid #11af74',
    placeholderColor: '#737573',

    colorError: '#0A110D',
    colorFocusError: '#0A110D',
    textColorError: '#ffffff',
    borderError: '2px solid #d03050',
    borderHoverError: '2px solid #de576d',
    borderFocusError: '2px solid #d03050',
    caretColorError: '#d03050',

    colorWarning: '#0A110D',
    colorFocusWarning: '#0A110D',
    textColorWarning: '#ffffff',
    borderWarning: '2px solid #f0a020',
    borderHoverWarning: '2px solid #f5bc53',
    borderFocusWarning: '2px solid #f0a020',
    caretColorWarning: '#f0a020',
  },
  Form: {
    labelTextColor: '#737573',
  },
  Button: {
    textColorPrimary: '#ffffff',
    textColorQuaternary: '#EAEBEB',

    textColorHoverQuaternary: '#11af74',
    colorHoverQuaternary: 'rgba(17, 175, 116, 0.1)',

    textColorPressedQuaternary: '#11af74',
    colorPressedQuaternary: 'rgba(17, 175, 116, 0.2)',
  },
  Tabs: {
    tabTextColorActiveLine: '#11af74',
    tabTextColorHoverLine: '#14c985',
    barColor: '#11af74',
  },
  Menu: {
    itemHeight: '28px',
    groupTextColor: '#737573',
    itemColorHover: 'transparent',
    itemColorActive: 'transparent',
    itemColorActiveHover: 'transparent',

    itemTextColorActive: '#11af74',
    itemIconColorActive: '#11af74',
    itemTextColorActiveHover: '#11af74',
    itemIconColorActiveHover: '#11af74',

    itemTextColorHover: '#14c985',
    itemIconColorHover: '#14c985',

    itemIndicatorColor: 'transparent',
    itemIndicatorColorHover: 'transparent',
    itemIndicatorColorActive: 'transparent',
  },
  Dropdown: {
    color: '#131613',
    optionColorHover: '#1A1E1B',
    dividerColor: '#2C3333',
    optionTextColor: '#ffffff',
    optionTextColorHover: '#11af74',
    optionIconColorHover: '#11af74',
  },
  Layout: {
    siderColor: '#0A110D',
    color: '#040E07',
  },
  Popover: {
    color: '#1E2320',
    textColor: '#EAEBEB',
    border: '1px solid #3B3C3D',
    borderRadius: '8px',
  },
  Upload: {
    itemColorHover: '#1E2320',
    itemColorActive: '#3B3C3D',
  },
  Message: {
    color: '#1E2320',
    textColor: '#EAEBEB',

    colorSuccess: '#1E2320',
    textColorSuccess: '#11af74',

    colorError: '#1E2320',
    textColorError: '#d03050',
    
    colorInfo: '#1E2320',
    textColorInfo: '#EAEBEB',

    colorWarning: '#1E2320',
    textColorWarning: '#f0a020',

    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
  },
};
