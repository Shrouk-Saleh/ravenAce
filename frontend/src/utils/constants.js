export const VIOLATION_TYPES = {
  TAB_SWITCH: "tab-switch",
  FULLSCREEN_EXIT: "fullscreen-exit",
  COPY: "copy",
  PASTE: "paste",
  RIGHT_CLICK: "right-click",
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const IMAGE_BASE_URL = API_BASE_URL.replace('/api', '');
