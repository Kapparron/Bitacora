const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Generated Drizzle migrations are .sql files resolved by babel-plugin-inline-import.
config.resolver.sourceExts.push('sql');

module.exports = config;
