import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375; // baseline for scaling
export const SCALE_FACTOR = Math.max(0.8, Math.min(1.3, SCREEN_WIDTH / BASE_WIDTH));

export const scaled = (value: number) => Math.round(value * SCALE_FACTOR);
