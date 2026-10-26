// utils/logger.js
function info(...args) {
  console.log(new Date().toISOString(), 'INFO', ...args);
}
function error(...args) {
  console.error(new Date().toISOString(), 'ERROR', ...args);
}
function warn(...args) {
  console.warn(new Date().toISOString(), 'WARN', ...args);
}
export default { info, error, warn };
