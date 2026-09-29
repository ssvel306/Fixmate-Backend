export const VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/; // matches "HH:mm", 24-hour format

// isValidTime() checks a string is a real "HH:mm" 24-hour time.
export const isValidTime = (value) => TIME_REGEX.test(value);

// isValidWorkingDays() checks the array only contains real weekday names.
export const isValidWorkingDays = (value) =>
  Array.isArray(value) && value.every((day) => VALID_DAYS.includes(day));
